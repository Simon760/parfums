import { z } from "zod";
import { handle } from "@/lib/api";
import { searchCandidates } from "@/lib/ai/importer";

export const maxDuration = 120;

export async function POST(request: Request) {
  return handle(async () => {
    const { query } = z.object({ query: z.string().trim().min(2).max(200) }).parse(await request.json());
    return { candidates: await searchCandidates(query) };
  });
}
