import { handle } from "@/lib/api";
import { savePerfumeSchema } from "@/lib/schemas";
import { savePerfume } from "@/lib/save";

export const maxDuration = 60;

/** Crée ou met à jour un parfum (+ notes, similarités, layerings, photo). */
export async function POST(request: Request) {
  return handle(async (supabase) => savePerfume(supabase, savePerfumeSchema.parse(await request.json())));
}
