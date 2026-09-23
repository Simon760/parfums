import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "./supabase/server";
import type { Layering, OlfactothequeDB, Oil, Perfume } from "./types";

type Row<T> = { id: string; data: T; image_url?: string | null };

/** Mode démo (dev uniquement) : lit data/olfactotheque_db.json, sans Supabase. */
export const DEMO_MODE = process.env.DEMO_MODE === "1" && process.env.NODE_ENV !== "production";

/** Charge toute la collection (quelques dizaines de lignes : on prend tout d'un coup). */
export async function loadDB(): Promise<OlfactothequeDB> {
  if (DEMO_MODE) {
    const { readFile } = await import("node:fs/promises");
    const db = JSON.parse(await readFile("data/olfactotheque_db.json", "utf8")) as OlfactothequeDB;
    const images = JSON.parse(await readFile("seed/images.json", "utf8")) as Record<string, { images: string[] }>;
    db.perfumes = db.perfumes.map((p) => ({ ...p, image_url: images[p.id]?.images[0] ?? null }));
    return db;
  }
  const supabase = await requireUser();
  if (!supabase) redirect("/login");
  return fetchDB(supabase);
}

export async function fetchDB(supabase: SupabaseClient): Promise<OlfactothequeDB> {
  const [meta, families, categories, notes, perfumes, oils, layerings, similarities] = await Promise.all([
    supabase.from("meta").select("key, value"),
    supabase.from("families").select("id, label, color").order("sort"),
    supabase.from("note_categories").select("id, label").order("sort"),
    supabase.from("notes").select("id, name, category").order("name"),
    supabase.from("perfumes").select("id, data, image_url").order("created_at"),
    supabase.from("oils").select("id, data, image_url").order("created_at"),
    supabase.from("layerings").select("id, data").order("created_at"),
    supabase.from("similarities").select("a, b, relation, reason"),
  ]);

  const firstError = [meta, families, categories, notes, perfumes, oils, layerings, similarities].find((r) => r.error);
  if (firstError?.error) throw new Error(`Supabase : ${firstError.error.message}`);

  const metaMap = Object.fromEntries((meta.data ?? []).map((m) => [m.key, m.value]));

  return {
    meta: {
      name: metaMap.name ?? "100bon",
      version: metaMap.version ?? "",
      generated_at: metaMap.generated_at ?? "",
      counts: {
        perfumes: perfumes.data?.length ?? 0,
        oils: oils.data?.length ?? 0,
        layerings: layerings.data?.length ?? 0,
        notes: notes.data?.length ?? 0,
      },
      scales: metaMap.scales ?? {},
      climate_reference: metaMap.climate_reference ?? { dubai_c: {}, france_rouen_c: {} },
      rules: metaMap.rules ?? [],
    },
    families: families.data ?? [],
    note_categories: categories.data ?? [],
    notes: notes.data ?? [],
    perfumes: ((perfumes.data ?? []) as Row<Perfume>[]).map((r) => ({ ...r.data, id: r.id, image_url: r.image_url })),
    oils: ((oils.data ?? []) as Row<Oil>[]).map((r) => ({ ...r.data, id: r.id, image_url: r.image_url })),
    layerings: ((layerings.data ?? []) as Row<Layering>[]).map((r) => ({ ...r.data, id: r.id })),
    similarities: similarities.data ?? [],
  } as OlfactothequeDB;
}
