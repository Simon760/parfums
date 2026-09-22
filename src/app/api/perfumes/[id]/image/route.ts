import { z } from "zod";
import { handle, HttpError } from "@/lib/api";
import { downloadImage, uploadBottle } from "@/lib/images";

export const maxDuration = 60;

/** Remplace la photo : fichier envoyé (multipart) ou URL d'image (JSON). */
export async function POST(request: Request, ctx: RouteContext<"/api/perfumes/[id]/image">) {
  const { id } = await ctx.params;
  return handle(async (supabase) => {
    let url: string;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File) || !file.type.startsWith("image/")) throw new HttpError("Fichier image attendu.");
      if (file.size > 8 * 1024 * 1024) throw new HttpError("Image trop lourde (> 8 Mo).");
      url = await uploadBottle(supabase, id, file, file.type);
    } else {
      const body = z.object({ url: z.string().url() }).parse(await request.json());
      const img = await downloadImage(body.url);
      url = await uploadBottle(supabase, id, img.data, img.contentType);
    }
    const { error } = await supabase.from("perfumes").update({ image_url: url }).eq("id", id);
    if (error) throw new HttpError(error.message, 500);
    return { image_url: url };
  });
}
