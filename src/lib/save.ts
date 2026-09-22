import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Layering, Perfume } from "./types";
import type { SavePerfumeInput } from "./schemas";
import { fetchDB } from "./data";
import { deriveLayeringWear, deriveRegionWear } from "./recommend";
import { downloadImage, uploadBottle } from "./images";
import { HttpError } from "./api";

export async function savePerfume(supabase: SupabaseClient, input: SavePerfumeInput) {
  const warnings: string[] = [];
  const perfume: Perfume = {
    ...(input.perfume as Perfume),
    wear: {
      ...input.perfume.wear,
      dubai: deriveRegionWear(input.perfume.wear.dubai.months),
      france: deriveRegionWear(input.perfume.wear.france.months),
    } as Perfume["wear"],
  };
  delete perfume.image_url;

  const { data: existing } = await supabase.from("perfumes").select("id").eq("id", perfume.id).maybeSingle();
  if (input.create && existing) throw new HttpError(`Un parfum avec l'id « ${perfume.id} » existe déjà.`, 409);
  if (!input.create && !existing) throw new HttpError("Parfum introuvable.", 404);

  // 1. Nouvelles notes
  if (input.new_notes.length) {
    const { error } = await supabase.from("notes").upsert(input.new_notes, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new HttpError(`Notes : ${error.message}`, 500);
  }
  const noteIds = [...perfume.notes.top, ...perfume.notes.heart, ...perfume.notes.base];
  if (noteIds.length) {
    const { data: known } = await supabase.from("notes").select("id").in("id", noteIds);
    const knownIds = new Set((known ?? []).map((n) => n.id));
    const missing = noteIds.filter((n) => !knownIds.has(n));
    if (missing.length) throw new HttpError(`Notes inconnues : ${missing.join(", ")}`);
  }

  // 2. Parfum
  const { error: perfumeError } = await supabase.from("perfumes").upsert({ id: perfume.id, data: perfume });
  if (perfumeError) throw new HttpError(`Parfum : ${perfumeError.message}`, 500);

  // 3. Similarités (création uniquement)
  if (input.create && input.similarities.length) {
    const rows = input.similarities.map((s) => ({ a: perfume.id, b: s.b, relation: s.relation, reason: s.reason }));
    const { error } = await supabase.from("similarities").upsert(rows, { onConflict: "a,b", ignoreDuplicates: true });
    if (error) warnings.push(`Similarités non enregistrées : ${error.message}`);
  }

  // 4. Layerings proposés
  if (input.layerings.length) {
    const db = await fetchDB(supabase);
    const taken = new Set(db.layerings.map((l) => l.id));
    const rows = input.layerings.map((draft) => {
      let id = draft.id;
      for (let i = 2; taken.has(id); i++) id = `${draft.id}_${i}`;
      taken.add(id);
      const layering: Layering = { ...draft, id };
      if (layering.status !== "déconseillé") layering.wear = deriveLayeringWear(db, layering);
      return { id, data: layering };
    });
    const { error } = await supabase.from("layerings").insert(rows);
    if (error) warnings.push(`Layerings non enregistrés : ${error.message}`);
  }

  // 5. Photo
  if (input.image_source_url) {
    try {
      const img = await downloadImage(input.image_source_url);
      const url = await uploadBottle(supabase, perfume.id, img.data, img.contentType);
      await supabase.from("perfumes").update({ image_url: url }).eq("id", perfume.id);
    } catch (e) {
      warnings.push(`Photo non enregistrée : ${e instanceof Error ? e.message : "erreur"}`);
    }
  }

  return { id: perfume.id, warnings };
}

export async function deletePerfume(supabase: SupabaseClient, id: string) {
  const { data: layerings } = await supabase.from("layerings").select("id, data");
  const linked = (layerings ?? [])
    .filter((l) => (l.data as Layering).components.some((c) => c.ref === id))
    .map((l) => l.id);
  if (linked.length) await supabase.from("layerings").delete().in("id", linked);

  const { error } = await supabase.from("perfumes").delete().eq("id", id);
  if (error) throw new HttpError(error.message, 500);
  await supabase.storage.from("bottles").remove(["jpg", "png", "webp", "avif"].map((ext) => `${id}.${ext}`));
  return { ok: true, removedLayerings: linked.length };
}
