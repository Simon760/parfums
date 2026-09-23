import type { LayeringComponent, OlfactothequeDB } from "../types";

export function componentName(db: OlfactothequeDB, c: Pick<LayeringComponent, "type" | "ref">) {
  if (c.type === "oil") return db.oils.find((o) => o.id === c.ref)?.name ?? c.ref;
  return db.perfumes.find((p) => p.id === c.ref)?.name ?? c.ref;
}

export function familyColor(db: OlfactothequeDB, family: string | undefined) {
  return db.families.find((f) => f.id === family)?.color ?? "#9aa3b5";
}

/** Fond « mesh » vivant à partir d'une couleur de famille. */
export function meshGradient(color: string) {
  return [
    `radial-gradient(90% 70% at 15% 10%, ${color}cc 0%, transparent 60%)`,
    `radial-gradient(80% 80% at 90% 90%, ${color}99 0%, transparent 65%)`,
    `radial-gradient(60% 60% at 85% 15%, #ffffffcc 0%, transparent 70%)`,
    `linear-gradient(160deg, ${color}40, ${color}26)`,
  ].join(", ");
}
