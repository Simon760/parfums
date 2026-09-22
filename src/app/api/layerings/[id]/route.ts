import { z } from "zod";
import { handle, HttpError } from "@/lib/api";

/** Change le statut d'un layering (ex. « à tester » → « validé »). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/layerings/[id]">) {
  const { id } = await ctx.params;
  return handle(async (supabase) => {
    const { status } = z
      .object({ status: z.enum(["validé", "recommandé", "à tester", "déconseillé"]) })
      .parse(await request.json());
    const { data, error } = await supabase.from("layerings").select("data").eq("id", id).single();
    if (error || !data) throw new HttpError("Layering introuvable.", 404);
    const { error: updateError } = await supabase
      .from("layerings")
      .update({ data: { ...data.data, status } })
      .eq("id", id);
    if (updateError) throw new HttpError(updateError.message, 500);
    return { ok: true };
  });
}
