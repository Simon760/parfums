import type { LayeringComponent, OlfactothequeDB } from "../types";

export function componentName(db: OlfactothequeDB, c: Pick<LayeringComponent, "type" | "ref">) {
  if (c.type === "oil") return db.oils.find((o) => o.id === c.ref)?.name ?? c.ref;
  return db.perfumes.find((p) => p.id === c.ref)?.name ?? c.ref;
}

export function familyColor(db: OlfactothequeDB, family: string) {
  return db.families.find((f) => f.id === family)?.color ?? "#b9ae9a";
}
