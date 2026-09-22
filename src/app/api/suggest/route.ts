import { handle } from "@/lib/api";
import { fetchDB } from "@/lib/data";
import { suggestRequestSchema, suggestWithAI } from "@/lib/ai/suggest";

export const maxDuration = 120;

export async function POST(request: Request) {
  return handle(async (supabase) => {
    const body = suggestRequestSchema.parse(await request.json());
    const db = await fetchDB(supabase);
    return suggestWithAI(db, body);
  });
}
