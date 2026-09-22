import "server-only";
import { z } from "zod";
import type { OlfactothequeDB } from "../types";
import { layeringSchema, noteSchema, perfumeSchema, similarityDraftSchema } from "../schemas";
import { deriveRegionWear } from "../recommend";
import { AIError, runForToolResult, toolSchema, WEB_TOOLS } from "./client";
import { oilsDigest, perfumeDigest } from "./digest";

// ---------- Étape 1 : recherche ----------

export const candidateSchema = z.object({
  name: z.string(),
  house: z.string(),
  year: z.number().int().nullable(),
  concentration: z.string().nullable(),
  description: z.string().describe("Une ligne : famille olfactive + notes marquantes, pour reconnaître le bon"),
  fragrantica_url: z.string().nullable(),
  official_url: z.string().nullable(),
});
export type Candidate = z.infer<typeof candidateSchema>;

const candidatesSchema = z.object({ candidates: z.array(candidateSchema).max(4) });

export async function searchCandidates(query: string): Promise<Candidate[]> {
  const raw = await runForToolResult({
    system: `Tu identifies des parfums à partir d'une recherche libre, pour l'app 100bon.
Utilise la recherche web pour trouver 1 à 4 correspondances réelles (différentes éditions / concentrations / flankers si ambigu).
Pour chacune, donne l'URL de la page Fragrantica (fragrantica.com/perfume/...) et celle de la page produit officielle si tu les trouves.
N'invente jamais d'URL : uniquement celles vues dans les résultats.
Rends le résultat avec l'outil \`rendre_candidats\`.`,
    prompt: `Recherche : """${query}"""`,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 4 },
      { name: "rendre_candidats", description: "Rend la liste des parfums correspondants.", input_schema: toolSchema(candidatesSchema) },
    ],
    resultTool: "rendre_candidats",
    effort: "low",
    maxTokens: 16000,
  });
  const parsed = candidatesSchema.safeParse(raw);
  if (!parsed.success) throw new AIError("Réponse de recherche mal formée, réessaie.");
  return parsed.data.candidates;
}

// ---------- Étape 2 : enrichissement ----------

const enrichmentSchema = z.object({
  perfume: perfumeSchema,
  new_notes: z.array(noteSchema).describe("Notes utilisées dans la pyramide qui n'existent pas encore dans le référentiel"),
  similarities: z.array(similarityDraftSchema).describe("Parfums de la collection proches / doublons / complémentaires"),
  layerings: z.array(layeringSchema).max(3).describe("2-3 layerings à tester avec la collection (status « à tester »)"),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  image_pages: z.array(z.string()).describe("URLs de pages produit (officielle, Fragrantica, revendeurs) montrant le flacon"),
});
export type Enrichment = z.infer<typeof enrichmentSchema>;

export async function enrichPerfume(
  db: OlfactothequeDB,
  candidate: Candidate,
  ownedFormat: string,
  existingId: string,
): Promise<Enrichment> {
  const examples = db.perfumes.slice(0, 2);
  const collection = db.perfumes.map((p) => perfumeDigest(db, p));
  const noteIndex = db.notes.map((n) => `${n.id}:${n.category}`).join(" ");

  const system = `Tu construis la fiche d'un parfum pour la collection personnelle de Simon (app 100bon), au format exact de sa base.

Méthode :
1. Recherche web : pyramide officielle (site de la marque d'abord, puis Fragrantica), accords, parfumeurs, année, concentration, avis sur tenue et sillage. Note tes sources.
2. Déduis ensuite, avec le même jugement que les fiches existantes :
   - family (${db.families.map((f) => `${f.id}=${f.label}`).join(", ")}) et family_label ;
   - wear.dubai.months et wear.france.months : 12 scores 0-3 (0 à éviter, 1 sous conditions, 2 bon, 3 idéal), en tenant compte du climat de chaque région ;
   - time_of_day, occasions, application (profile frais = zones larges/tissu, intense = peau nue, peu de sprays), sillage 1-4 ;
   - perception_risk : « élevé » si base ambroxan/ambrofix/cétalox ou muscs dominants, « moyen » si drydown musqué linéaire, sinon « faible » ;
   - recommended_oil : une des huiles de Simon, avec la raison ;
   - similarities avec les parfums existants (doublon = même construction, proche = même fenêtre, complementaire = bon contraste) ;
   - 2-3 layerings « à tester » avec ses parfums/huiles, en suivant ses règles (contraste, jamais deux bases ambroxan). Pour chaque layering : components dans l'ordre d'application (huile d'abord, puis fond, puis dessus), application_order = "fond → dessus (huile d'abord, puis parfum de fond, puis parfum de dessus)".
3. Notes : réutilise les ids existants du référentiel quand la matière correspond ; sinon crée-la dans new_notes (id snake_case sans accents, name en français avec accents, category).
4. image_pages : pages produit où l'on voit le flacon (officielle, Fragrantica, revendeurs).

Tout le texte est en français, dans le ton des fiches existantes (summary : 1-2 phrases, concret).
Rends la fiche avec l'outil \`rendre_fiche\`.`;

  const prompt = `## Parfum à ajouter
${JSON.stringify(candidate)}
- id à utiliser : "${existingId}"
- owned_format : "${ownedFormat}"

## Règles de Simon
${db.meta.rules.map((r) => `- ${r}`).join("\n")}

## Climat de référence (°C min-max)
${JSON.stringify(db.meta.climate_reference)}

## Huiles
${JSON.stringify(oilsDigest(db))}

## Référentiel de notes (id:catégorie)
${noteIndex}

## Deux fiches existantes (exemples de format et de jugement)
${JSON.stringify(examples)}

## Collection actuelle
${JSON.stringify(collection)}`;

  const raw = await runForToolResult({
    system,
    prompt,
    tools: [
      ...WEB_TOOLS,
      { name: "rendre_fiche", description: "Rend la fiche complète du parfum.", input_schema: toolSchema(enrichmentSchema) },
    ],
    resultTool: "rendre_fiche",
    effort: "medium",
    maxTokens: 48000,
  });

  const parsed = enrichmentSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AIError(`Fiche générée incomplète (${first?.path.join(".")} : ${first?.message}). Réessaie.`);
  }
  return normalizeEnrichment(db, parsed.data, existingId);
}

function normalizeEnrichment(db: OlfactothequeDB, e: Enrichment, id: string): Enrichment {
  const perfume = { ...e.perfume, id };
  perfume.wear = {
    ...perfume.wear,
    dubai: deriveRegionWear(perfume.wear.dubai.months),
    france: deriveRegionWear(perfume.wear.france.months),
  };

  const knownNotes = new Set(db.notes.map((n) => n.id));
  const newNotes = e.new_notes.filter((n) => !knownNotes.has(n.id));
  const allNotes = new Set([...knownNotes, ...newNotes.map((n) => n.id)]);
  // Une note référencée mais jamais déclarée : on la crée avec un nom lisible.
  for (const noteId of [...perfume.notes.top, ...perfume.notes.heart, ...perfume.notes.base]) {
    if (!allNotes.has(noteId)) {
      newNotes.push({ id: noteId, name: humanize(noteId), category: "boise" });
      allNotes.add(noteId);
    }
  }

  const perfumeIds = new Set(db.perfumes.map((p) => p.id));
  const oilIds = new Set(db.oils.map((o) => o.id));
  if (!oilIds.has(perfume.recommended_oil.oil) && db.oils[0]) {
    perfume.recommended_oil = { oil: db.oils[0].id, reason: perfume.recommended_oil.reason };
  }

  const layerings = e.layerings
    .map((l) => ({ ...l, status: "à tester" as const, signature: false }))
    .filter((l) =>
      l.components.every((c) =>
        c.type === "oil" ? oilIds.has(c.ref) : c.ref === id || perfumeIds.has(c.ref),
      ),
    );

  return {
    ...e,
    perfume,
    new_notes: newNotes,
    similarities: e.similarities.filter((s) => perfumeIds.has(s.b) && s.b !== id),
    layerings,
  };
}

function humanize(id: string) {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Étape 3 : photos ----------

const pagesSchema = z.object({ pages: z.array(z.string()).max(6) });

/** Cherche des pages produit (officielle, Fragrantica, revendeurs) pour un parfum. */
export async function findProductPages(name: string, house: string): Promise<string[]> {
  const raw = await runForToolResult({
    system: `Trouve des pages web montrant le flacon d'un parfum : page produit officielle de la marque, page Fragrantica (fragrantica.com/perfume/...), grands revendeurs. N'invente aucune URL. Rends-les avec l'outil \`rendre_pages\`.`,
    prompt: `Parfum : ${name} — ${house}`,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 3 },
      { name: "rendre_pages", description: "Rend les URLs de pages produit.", input_schema: toolSchema(pagesSchema) },
    ],
    resultTool: "rendre_pages",
    effort: "low",
    maxTokens: 8000,
  });
  const parsed = pagesSchema.safeParse(raw);
  return parsed.success ? parsed.data.pages : [];
}
