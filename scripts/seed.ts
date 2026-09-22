/**
 * Importe data/olfactotheque_db.json dans Supabase, puis les photos listées dans seed/images.json.
 *
 *   npm run seed                 # données + photos (refuse si la base contient déjà des parfums)
 *   npm run seed -- --force      # écrase les données existantes par le JSON
 *   npm run seed -- --images     # photos uniquement (parfums sans photo)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { OlfactothequeDB } from "../src/lib/types";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const IMAGES_ONLY = args.has("--images");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies (.env.local).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

function check<T extends { error: { message: string } | null }>(label: string, res: T) {
  if (res.error) {
    console.error(`✗ ${label} : ${res.error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
  return res;
}

async function seedData(db: OlfactothequeDB) {
  const { count } = await supabase.from("perfumes").select("id", { count: "exact", head: true });
  if (count && !FORCE) {
    console.error(`La base contient déjà ${count} parfums. Relance avec --force pour écraser, ou --images pour les photos.`);
    process.exit(1);
  }

  const meta = Object.entries(db.meta)
    .filter(([key]) => key !== "counts")
    .map(([key, value]) => ({ key, value }));
  check("meta", await supabase.from("meta").upsert(meta));
  check("familles", await supabase.from("families").upsert(db.families.map((f, sort) => ({ ...f, sort }))));
  check(
    "catégories de notes",
    await supabase.from("note_categories").upsert(db.note_categories.map((c, sort) => ({ ...c, sort }))),
  );
  check("notes", await supabase.from("notes").upsert(db.notes));

  // created_at échelonné pour garder l'ordre du JSON.
  const t0 = Date.now() - 100_000;
  const at = (i: number) => new Date(t0 + i * 1000).toISOString();
  check(
    "parfums",
    await supabase.from("perfumes").upsert(db.perfumes.map((p, i) => ({ id: p.id, data: p, created_at: at(i) }))),
  );
  check("huiles", await supabase.from("oils").upsert(db.oils.map((o, i) => ({ id: o.id, data: o, created_at: at(i) }))));
  check(
    "layerings",
    await supabase.from("layerings").upsert(db.layerings.map((l, i) => ({ id: l.id, data: l, created_at: at(i) }))),
  );
  check(
    "similarités",
    await supabase.from("similarities").upsert(db.similarities, { onConflict: "a,b" }),
  );
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

async function seedImages() {
  const manifest = JSON.parse(readFileSync("seed/images.json", "utf8")) as Record<
    string,
    { page: string | null; images: string[] }
  >;
  const { data: rows } = await supabase.from("perfumes").select("id, image_url");
  const missing = (rows ?? []).filter((r) => !r.image_url).map((r) => r.id);
  console.log(`\nPhotos : ${missing.length} parfum(s) sans photo`);

  for (const id of missing) {
    const candidates = manifest[id]?.images ?? [];
    let done = false;
    for (const src of candidates) {
      try {
        const res = await fetch(src, { headers: { "user-agent": UA, accept: "image/*" }, signal: AbortSignal.timeout(15000) });
        const type = res.headers.get("content-type")?.split(";")[0] ?? "";
        if (!res.ok || !type.startsWith("image/")) throw new Error(`${res.status} ${type}`);
        const path = `${id}.${EXT[type] ?? "jpg"}`;
        const up = await supabase.storage.from("bottles").upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
        if (up.error) throw new Error(up.error.message);
        const publicUrl = supabase.storage.from("bottles").getPublicUrl(path).data.publicUrl;
        await supabase.from("perfumes").update({ image_url: `${publicUrl}?v=${Date.now()}` }).eq("id", id);
        console.log(`  ✓ ${id}`);
        done = true;
        break;
      } catch (e) {
        console.log(`  · ${id} : ${src} → ${e instanceof Error ? e.message : e}`);
      }
    }
    if (!done) console.log(`  ✗ ${id} : pas de photo (visuel généré utilisé ; à remplacer depuis la fiche)`);
  }
}

async function main() {
  if (!IMAGES_ONLY) {
    const db = JSON.parse(readFileSync("data/olfactotheque_db.json", "utf8")) as OlfactothequeDB;
    await seedData(db);
  }
  await seedImages();
  console.log("\nTerminé.");
}

main();
