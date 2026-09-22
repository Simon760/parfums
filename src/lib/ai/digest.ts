import "server-only";
import type { OlfactothequeDB, Perfume } from "../types";

/** Résumé compact de la collection pour les prompts (évite d'envoyer tout le JSON). */
export function perfumeDigest(db: OlfactothequeDB, p: Perfume, month?: number) {
  const noteName = new Map(db.notes.map((n) => [n.id, n.name]));
  const names = (ids: string[]) => ids.map((id) => noteName.get(id) ?? id).join(", ");
  return {
    id: p.id,
    nom: `${p.name} — ${p.house}`,
    famille: p.family_label,
    accords: p.accords.join(", "),
    notes: `tête: ${names(p.notes.top)} | cœur: ${names(p.notes.heart)} | fond: ${names(p.notes.base)}`,
    sillage: `${p.performance.sillage}/4`,
    tenue_h: `${p.performance.longevity_h.min}-${p.performance.longevity_h.max}`,
    moment: p.wear.time_of_day.join("+"),
    occasions: p.occasions.join(", "),
    ...(month != null
      ? { score_mois: { dubai: p.wear.dubai.months[month], france: p.wear.france.months[month] } }
      : {}),
    application: `${p.application.sprays.min}-${p.application.sprays.max} sprays · ${p.application.zones.join(", ")}`,
    perception: p.perception_risk.level + (p.perception_risk.reason ? ` (${p.perception_risk.reason})` : ""),
    huile_conseillee: p.recommended_oil.oil,
    resume: p.summary,
  };
}

export function oilsDigest(db: OlfactothequeDB) {
  return db.oils.map((o) => ({ id: o.id, nom: o.name, profil: o.profile, role: o.role, dosage: o.dosage.method }));
}
