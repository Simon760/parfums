import "server-only";
import { z } from "zod";
import type { OlfactothequeDB, Region } from "../types";
import { MONTH_LABELS, REGION_LABELS } from "../labels";
import { runForToolResult, AIError, toolSchema } from "./client";
import { oilsDigest, perfumeDigest } from "./digest";

export const suggestRequestSchema = z.object({
  mood: z.string().trim().min(2).max(600),
  region: z.enum(["dubai", "france"]),
  month: z.number().int().min(0).max(11),
  time: z.enum(["day", "evening"]),
  weather: z
    .object({
      temp: z.number().nullable(),
      tempMax: z.number().nullable(),
      tempMin: z.number().nullable(),
      condition: z.string().nullable(),
    })
    .nullable(),
});
export type SuggestRequest = z.infer<typeof suggestRequestSchema>;

export const suggestionResultSchema = z.object({
  lecture: z.string().describe("1-2 phrases : comment tu as compris le mood et le contexte du jour"),
  choix: z
    .array(
      z.object({
        type: z.enum(["perfume", "layering"]),
        ref: z.string().describe("id exact du parfum ou du layering"),
        pourquoi: z.string().describe("2-3 phrases, concrètes, qui relient le parfum au mood et à la météo"),
        dosage: z.string().describe("Ex. « 2 sprays : cou + pli du coude »"),
        huile: z.string().nullable().describe("id d'huile à poser dessous, ou null"),
        conseil: z.string().nullable().describe("Astuce d'application ou de timing, ou null"),
      }),
    )
    .min(1)
    .max(3),
  a_eviter: z.string().nullable().describe("Ce qu'il vaut mieux éviter aujourd'hui et pourquoi, ou null"),
});
export type SuggestionResult = z.infer<typeof suggestionResultSchema>;

const SYSTEM = `Tu es le conseiller parfum personnel de Simon, dans l'app 100bon.
Tu choisis dans SA collection (et seulement elle) le parfum ou le layering du jour, en croisant son mood, la région (Dubaï ou France), le mois, la météo réelle et le moment de la journée.

Principes :
- Les scores mensuels (0 à éviter, 1 sous conditions, 2 bon, 3 idéal) sont une base, la météo réelle et le mood priment pour départager.
- À Dubaï, l'intérieur climatisé rend les chauds portables le soir ; la vraie limite est l'extérieur en journée.
- Respecte ses règles personnelles (fournies) : bases ambroxan jamais dosées au nez, layering par contraste, jamais deux bases ambroxan ni deux ADN identiques.
- Varie : propose des options réellement différentes (pas trois ambrés).
- Ton : français, direct, chaleureux, précis. Pas de superlatifs creux.

Rends ton résultat en appelant l'outil \`rendre_suggestion\`.`;

export async function suggestWithAI(db: OlfactothequeDB, req: SuggestRequest): Promise<SuggestionResult> {
  const region = req.region as Region;
  const perfumes = db.perfumes
    .filter((p) => p.wear[region].months[req.month] >= 1)
    .map((p) => perfumeDigest(db, p, req.month));
  const layerings = db.layerings
    .filter((l) => l.status !== "déconseillé" && l.wear && l.wear[region].months[req.month] >= 1)
    .map((l) => ({
      id: l.id,
      statut: l.status,
      signature: l.signature,
      objectif: l.goal,
      composants: l.components.map((c) => `${c.role}: ${c.ref}${c.dose ? ` (${c.dose})` : ""}`).join(" → "),
      moment: l.time_of_day?.join("+") ?? "tous",
      score_mois: l.wear![region].months[req.month],
      logique: l.rationale,
    }));

  const w = req.weather;
  const meteo = w
    ? `${w.temp ?? "?"}°C maintenant, max ${w.tempMax ?? "?"}°C, min ${w.tempMin ?? "?"}°C${w.condition ? `, ${w.condition}` : ""}`
    : "indisponible";

  // Partie stable d'abord (mise en cache), contexte et mood à la fin.
  const prompt = `## Ses règles
${db.meta.rules.map((r) => `- ${r}`).join("\n")}

## Parfums portables ce mois-ci
${JSON.stringify(perfumes)}

## Huiles
${JSON.stringify(oilsDigest(db))}

## Layerings possibles ce mois-ci
${JSON.stringify(layerings)}

## Contexte du jour
- Région : ${REGION_LABELS[region]}
- Mois : ${MONTH_LABELS[req.month]}
- Moment : ${req.time === "day" ? "journée" : "soirée"}
- Météo : ${meteo}

## Mood de Simon
"""${req.mood}"""

Propose 1 à 3 choix, du plus adapté au moins adapté.`;

  const raw = await runForToolResult({
    system: SYSTEM,
    prompt,
    resultTool: "rendre_suggestion",
    tools: [
      {
        name: "rendre_suggestion",
        description: "Rend la suggestion finale du jour à l'app.",
        input_schema: toolSchema(suggestionResultSchema),
      },
    ],
    effort: "medium",
    maxTokens: 16000,
  });

  const parsed = suggestionResultSchema.safeParse(raw);
  if (!parsed.success) throw new AIError("Réponse de l'IA mal formée, réessaie.");

  const perfumeIds = new Set(db.perfumes.map((p) => p.id));
  const layeringIds = new Set(db.layerings.map((l) => l.id));
  const oilIds = new Set(db.oils.map((o) => o.id));
  const choix = parsed.data.choix
    .filter((c) => (c.type === "perfume" ? perfumeIds.has(c.ref) : layeringIds.has(c.ref)))
    .map((c) => ({ ...c, huile: c.huile && oilIds.has(c.huile) ? c.huile : null }));
  if (choix.length === 0) throw new AIError("L'IA n'a proposé aucun parfum de ta collection, réessaie.");

  return { ...parsed.data, choix };
}
