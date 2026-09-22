import { z } from "zod";
import { handle } from "@/lib/api";
import { fetchDB } from "@/lib/data";
import { candidateSchema, enrichPerfume } from "@/lib/ai/importer";
import { slugify } from "@/lib/recommend";

export const maxDuration = 300;

export async function POST(request: Request) {
  return handle(async (supabase) => {
    const body = z
      .object({
        candidate: candidateSchema,
        owned_format: z.enum(["original", "dupe", "original + dupe", "inconnu"]),
      })
      .parse(await request.json());
    const db = await fetchDB(supabase);

    const base = slugify(body.candidate.name).replace(/_/g, "") || "parfum";
    let id = base;
    for (let i = 2; db.perfumes.some((p) => p.id === id); i++) id = `${base}${i}`;

    return enrichPerfume(db, body.candidate, body.owned_format, id);
  });
}
