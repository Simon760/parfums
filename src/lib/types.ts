// Types de la base (forme de data/olfactotheque_db.json, v2.0.0).
// En base, chaque Perfume / Oil / Layering est stocké tel quel dans une colonne jsonb.

/** 0 = à éviter · 1 = possible sous conditions (clim / dose minimale) · 2 = bon · 3 = idéal */
export type MonthScore = 0 | 1 | 2 | 3;
/** 12 valeurs, index 0 = janvier … 11 = décembre */
export type MonthScores = [
  MonthScore, MonthScore, MonthScore, MonthScore, MonthScore, MonthScore,
  MonthScore, MonthScore, MonthScore, MonthScore, MonthScore, MonthScore
];
export type MonthKey = "jan" | "fev" | "mar" | "avr" | "mai" | "juin" | "juil" | "aout" | "sep" | "oct" | "nov" | "dec";
export type Season = "hiver" | "printemps" | "ete" | "automne";
export type Region = "dubai" | "france";
export type TimeOfDay = "day" | "evening";

export type FamilyId = "frais" | "propre" | "floral" | "fruite" | "gourmand" | "ambre" | "boise" | "oud";
export type NoteCategory =
  | "agrume" | "fruit" | "floral" | "epice" | "aromatique" | "boise" | "resine_ambre"
  | "gourmand" | "musc" | "cuir" | "fume_tabac" | "aquatique_mineral" | "oud";

export type Occasion =
  | "daily" | "bureau" | "date" | "diner" | "soiree" | "evenement" | "mariage"
  | "sport" | "plage" | "voyage" | "cocooning" | "majlis";

export type SillageLevel = 1 | 2 | 3 | 4; // Faible · Modéré · Explosif · Bombe nucléaire
export type OwnedFormat = "original" | "dupe" | "original + dupe" | "inconnu";
export type PerceptionRisk = "élevé" | "moyen" | "faible";
export type LayeringStatus = "validé" | "recommandé" | "à tester" | "déconseillé";

export interface NotePyramid { top: string[]; heart: string[]; base: string[] } // ids -> Note.id

export interface RegionWear { months: MonthScores; best_months: MonthKey[]; seasons?: Season[] }

export interface Note { id: string; name: string; category: NoteCategory }

export interface Perfume {
  id: string;
  name: string;
  house: string;
  year: number | null;
  perfumers: string[];
  concentration: string;
  owned_format: OwnedFormat;
  family: FamilyId;
  family_label: string;
  accords: string[];
  notes: NotePyramid;
  pyramid_note: string | null;
  performance: {
    sillage: SillageLevel;
    sillage_label: string;
    longevity_h: { min: number; max: number };
  };
  application: {
    profile: "frais" | "intense";
    sprays: { min: number; max: number };
    zones: string[];
    rules: string[];
  };
  wear: {
    time_of_day: TimeOfDay[];
    dubai: RegionWear;
    france: RegionWear;
  };
  occasions: Occasion[];
  perception_risk: { level: PerceptionRisk; reason: string | null };
  recommended_oil: { oil: string; reason: string }; // -> Oil.id
  summary: string;
  /** Hors jsonb : colonne perfumes.image_url, fusionnée au chargement. */
  image_url?: string | null;
}

export interface Oil {
  id: string;
  name: string;
  type: string;
  source: string;
  notes: NotePyramid;
  pyramid_note: string | null;
  profile: string;
  role: string;
  dosage: { drops: { min: number; max: number }; method: string };
  wear: { dubai: RegionWear; france: RegionWear };
  recommended_for: string[]; // -> Perfume.id
  image_url?: string | null;
}

export interface LayeringComponent {
  type: "perfume" | "oil";
  ref: string; // Perfume.id ou Oil.id
  role: "fond" | "milieu" | "dessus";
  dose?: string;
}

export interface Layering {
  id: string;
  status: LayeringStatus;
  signature: boolean;
  goal: string;
  components: LayeringComponent[]; // déjà dans l'ordre d'application
  application_order: string;
  time_of_day: TimeOfDay[] | null;
  rationale: string;
  dosage?: string;
  /** Absent si status = "déconseillé". Score mensuel = minimum des composants. */
  wear?: { dubai: RegionWear; france: RegionWear };
}

export interface Similarity {
  a: string; b: string; // Perfume.id
  relation: "doublon" | "proche" | "complementaire";
  reason: string;
}

export interface OlfactothequeDB {
  meta: {
    name: string;
    version: string;
    generated_at: string;
    counts: { perfumes: number; oils: number; layerings: number; notes: number };
    scales: Record<string, unknown>;
    climate_reference: { dubai_c: Record<MonthKey, string>; france_rouen_c: Record<MonthKey, string> };
    rules: string[];
  };
  families: { id: FamilyId; label: string; color: string }[];
  note_categories: { id: NoteCategory; label: string }[];
  notes: Note[];
  perfumes: Perfume[];
  oils: Oil[];
  layerings: Layering[];
  similarities: Similarity[];
}

// ---------- Helpers prêts à l'emploi ----------

/** Parfums portables un mois donné (1-12), dans une région, à partir d'un score minimum. */
export function wearableIn(db: OlfactothequeDB, region: Region, month: number, minScore: MonthScore = 2, time?: TimeOfDay) {
  return db.perfumes
    .filter(p => p.wear[region].months[month - 1] >= minScore)
    .filter(p => !time || p.wear.time_of_day.includes(time))
    .sort((a, b) => b.wear[region].months[month - 1] - a.wear[region].months[month - 1]);
}

/** Layerings utilisables un mois donné (hors déconseillés). */
export function layeringsFor(db: OlfactothequeDB, region: Region, month: number, minScore: MonthScore = 2) {
  return db.layerings.filter(l => l.status !== "déconseillé" && l.wear && l.wear[region].months[month - 1] >= minScore);
}

/** Tous les layerings (y compris déconseillés) qui impliquent un parfum ou une huile. */
export function layeringsWith(db: OlfactothequeDB, ref: string) {
  return db.layerings.filter(l => l.components.some(c => c.ref === ref));
}

/** Résout les ids de notes en objets Note. */
export function resolveNotes(db: OlfactothequeDB, ids: string[]) {
  const idx = new Map(db.notes.map(n => [n.id, n]));
  return ids.map(id => idx.get(id)!);
}
