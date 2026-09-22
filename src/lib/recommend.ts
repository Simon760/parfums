import type { Layering, MonthScore, Occasion, OlfactothequeDB, Perfume, Region, RegionWear, Season, TimeOfDay } from "./types";
import { MONTH_KEYS } from "./labels";

export interface DayContext {
  region: Region;
  /** 0 = janvier … 11 = décembre */
  month: number;
  time: TimeOfDay;
  occasion?: Occasion | null;
  /** Température max du jour (°C), si la météo live est disponible. */
  tempMax?: number | null;
}

export interface Suggestion {
  perfume: Perfume;
  score: number;
  monthScore: MonthScore;
  reasons: string[];
  tips: string[];
  layering?: Layering;
}

const WARM_FAMILIES = new Set(["ambre", "oud", "gourmand"]);
const FRESH_FAMILIES = new Set(["frais", "propre"]);

/** Classement déterministe des parfums pour un contexte donné. */
export function suggestPerfumes(db: OlfactothequeDB, ctx: DayContext): Suggestion[] {
  const results = db.perfumes.map((p) => {
    const monthScore = p.wear[ctx.region].months[ctx.month] as MonthScore;
    const reasons: string[] = [];
    const tips: string[] = [];
    let score = monthScore * 10;

    if (monthScore === 3) reasons.push("Idéal ce mois-ci");
    else if (monthScore === 2) reasons.push("Bon ce mois-ci");
    else if (monthScore === 1) tips.push("Mois limite : dose minimale, plutôt en intérieur.");

    if (p.wear.time_of_day.includes(ctx.time)) {
      score += 6;
    } else {
      score -= 14;
    }

    if (ctx.occasion) {
      if (p.occasions.includes(ctx.occasion)) {
        score += 10;
        reasons.push("Fait pour l'occasion");
      } else {
        score -= 4;
      }
    }

    const t = ctx.tempMax;
    if (t != null) {
      if (t >= 33 && ctx.time === "day") {
        if (WARM_FAMILIES.has(p.family) || p.performance.sillage >= 3) score -= 8;
        if (FRESH_FAMILIES.has(p.family)) {
          score += 5;
          reasons.push(`Tient la chaleur (${Math.round(t)}°C)`);
        }
      } else if (t <= 10) {
        if (WARM_FAMILIES.has(p.family)) {
          score += 4;
          reasons.push(`Chaleur bienvenue (${Math.round(t)}°C)`);
        }
        if (FRESH_FAMILIES.has(p.family)) {
          tips.push("Par temps froid, pose White Musk dessous pour qu'il diffuse.");
        }
      }
    }

    if (p.perception_risk.level === "élevé") {
      tips.push("Base ambroxan : ne dose pas à ton nez, les autres le sentent encore.");
    }

    return { perfume: p, score, monthScore, reasons, tips };
  });

  return results
    .filter((r) => r.monthScore > 0)
    .sort((a, b) => b.score - a.score || b.monthScore - a.monthScore)
    .map((r) => ({ ...r, layering: bestLayeringFor(db, r.perfume.id, ctx) }));
}

/** Layerings utilisables dans le contexte (hors déconseillés), triés par statut puis score. */
export function layeringsForContext(db: OlfactothequeDB, ctx: DayContext): Layering[] {
  const statusRank: Record<string, number> = { validé: 0, recommandé: 1, "à tester": 2 };
  return db.layerings
    .filter((l) => l.status !== "déconseillé" && l.wear && l.wear[ctx.region].months[ctx.month] >= 2)
    .filter((l) => !l.time_of_day || l.time_of_day.includes(ctx.time))
    .sort(
      (a, b) =>
        Number(b.signature) - Number(a.signature) ||
        statusRank[a.status] - statusRank[b.status] ||
        b.wear![ctx.region].months[ctx.month] - a.wear![ctx.region].months[ctx.month],
    );
}

function bestLayeringFor(db: OlfactothequeDB, perfumeId: string, ctx: DayContext) {
  return layeringsForContext(db, ctx).find((l) => l.components.some((c) => c.ref === perfumeId));
}

// ---------- Dérivés de wear (utilisés par l'édition et l'import) ----------

const SEASON_MONTHS: Record<Season, number[]> = {
  hiver: [11, 0, 1],
  printemps: [2, 3, 4],
  ete: [5, 6, 7],
  automne: [8, 9, 10],
};

/** Recalcule best_months (score 3) et seasons (au moins un mois ≥ 2) à partir des scores. */
export function deriveRegionWear(months: number[], withSeasons = true): RegionWear {
  const m = normalizeMonths(months);
  const wear: RegionWear = {
    months: m,
    best_months: MONTH_KEYS.filter((_, i) => m[i] === 3),
  };
  if (withSeasons) {
    wear.seasons = (Object.keys(SEASON_MONTHS) as Season[]).filter((s) => SEASON_MONTHS[s].some((i) => m[i] >= 2));
  }
  return wear;
}

export function normalizeMonths(months: number[]): RegionWear["months"] {
  const out = Array.from({ length: 12 }, (_, i) => {
    const v = Math.round(Number(months?.[i] ?? 0));
    return Math.min(3, Math.max(0, Number.isFinite(v) ? v : 0)) as MonthScore;
  });
  return out as RegionWear["months"];
}

/** Score mensuel d'un layering = minimum des composants. */
export function deriveLayeringWear(db: OlfactothequeDB, layering: Layering): Layering["wear"] {
  const regions: Region[] = ["dubai", "france"];
  const wear = {} as NonNullable<Layering["wear"]>;
  for (const region of regions) {
    const months = Array.from({ length: 12 }, (_, i) =>
      Math.min(
        ...layering.components.map((c) => {
          const item = c.type === "perfume" ? db.perfumes.find((p) => p.id === c.ref) : db.oils.find((o) => o.id === c.ref);
          return item ? item.wear[region].months[i] : 0;
        }),
      ),
    );
    wear[region] = deriveRegionWear(months, false);
  }
  return wear;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
