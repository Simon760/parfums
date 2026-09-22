import { handle } from "@/lib/api";
import { deletePerfume } from "@/lib/save";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/perfumes/[id]">) {
  const { id } = await ctx.params;
  return handle(async (supabase) => deletePerfume(supabase, id));
}
