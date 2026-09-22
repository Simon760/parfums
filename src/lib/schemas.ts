import { z } from "zod";

const monthScore = z.number().int().min(0).max(3);
const months = z.array(monthScore).length(12).describe("12 scores 0-3, index 0 = janvier … 11 = décembre");
const pyramid = z.object({
  top: z.array(z.string()),
  heart: z.array(z.string()),
  base: z.array(z.string()),
});
const regionWear = z.object({
  months,
  best_months: z.array(z.string()).optional(),
  seasons: z.array(z.string()).optional(),
});

export const familyId = z.enum(["frais", "propre", "floral", "fruite", "gourmand", "ambre", "boise", "oud"]);
export const occasion = z.enum([
  "daily", "bureau", "date", "diner", "soiree", "evenement", "mariage", "sport", "plage", "voyage", "cocooning", "majlis",
]);
export const noteCategory = z.enum([
  "agrume", "fruit", "floral", "epice", "aromatique", "boise", "resine_ambre", "gourmand", "musc", "cuir", "fume_tabac",
  "aquatique_mineral", "oud",
]);

export const perfumeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "id : minuscules, chiffres et _ uniquement"),
  name: z.string().min(1),
  house: z.string().min(1),
  year: z.number().int().nullable(),
  perfumers: z.array(z.string()),
  concentration: z.string(),
  owned_format: z.enum(["original", "dupe", "original + dupe", "inconnu"]),
  family: familyId,
  family_label: z.string().describe("Ex. « Ambré boisé », « Floral musqué propre »"),
  accords: z.array(z.string()),
  notes: pyramid.describe("Ids de notes (snake_case sans accents)"),
  pyramid_note: z.string().nullable(),
  performance: z.object({
    sillage: z.number().int().min(1).max(4),
    sillage_label: z.string(),
    longevity_h: z.object({ min: z.number(), max: z.number() }),
  }),
  application: z.object({
    profile: z.enum(["frais", "intense"]),
    sprays: z.object({ min: z.number().int(), max: z.number().int() }),
    zones: z.array(z.string()),
    rules: z.array(z.string()),
  }),
  wear: z.object({
    time_of_day: z.array(z.enum(["day", "evening"])).min(1),
    dubai: regionWear,
    france: regionWear,
  }),
  occasions: z.array(occasion),
  perception_risk: z.object({
    level: z.enum(["élevé", "moyen", "faible"]),
    reason: z.string().nullable(),
  }),
  recommended_oil: z.object({ oil: z.string(), reason: z.string() }),
  summary: z.string(),
});

export const noteSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  category: noteCategory,
});

export const layeringComponentSchema = z.object({
  type: z.enum(["perfume", "oil"]),
  ref: z.string(),
  role: z.enum(["fond", "milieu", "dessus"]),
  dose: z.string().optional(),
});

export const layeringSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  status: z.enum(["validé", "recommandé", "à tester", "déconseillé"]),
  signature: z.boolean(),
  goal: z.string(),
  components: z.array(layeringComponentSchema).min(2),
  application_order: z.string(),
  time_of_day: z.array(z.enum(["day", "evening"])).nullable(),
  rationale: z.string(),
  dosage: z.string().optional(),
});

export const similarityDraftSchema = z.object({
  b: z.string().describe("id du parfum existant"),
  relation: z.enum(["doublon", "proche", "complementaire"]),
  reason: z.string(),
});

/** Ce que l'app enregistre quand on ajoute / modifie un parfum. */
export const savePerfumeSchema = z.object({
  perfume: perfumeSchema,
  new_notes: z.array(noteSchema).default([]),
  similarities: z.array(similarityDraftSchema).default([]),
  layerings: z.array(layeringSchema).default([]),
  image_source_url: z.string().url().nullable().optional(),
  /** true = création (refuse si l'id existe déjà) */
  create: z.boolean().default(false),
});

export type SavePerfumeInput = z.infer<typeof savePerfumeSchema>;
export type LayeringDraft = z.infer<typeof layeringSchema>;
export type SimilarityDraft = z.infer<typeof similarityDraftSchema>;
