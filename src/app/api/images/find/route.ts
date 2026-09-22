import { z } from "zod";
import { handle } from "@/lib/api";
import { findProductPages } from "@/lib/ai/importer";
import { extractImagesFromPage } from "@/lib/images";

export const maxDuration = 120;

/** Trouve des photos de flacon : à partir de pages connues, sinon via une recherche web. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = z
      .object({
        name: z.string().min(1),
        house: z.string().min(1),
        pages: z.array(z.string().url()).max(8).optional(),
      })
      .parse(await request.json());

    let pages = body.pages?.length ? body.pages : [];
    let images = (await Promise.all(pages.map(extractImagesFromPage))).flat();
    if (images.length === 0) {
      pages = await findProductPages(body.name, body.house);
      images = (await Promise.all(pages.map(extractImagesFromPage))).flat();
    }
    return { pages, images: [...new Set(images)].slice(0, 12) };
  });
}
