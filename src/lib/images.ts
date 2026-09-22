import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_BYTES = 8 * 1024 * 1024;

/** Image Fragrantica dérivée de l'URL de la fiche (…-12345.html). */
export function fragranticaImage(pageUrl: string): string | null {
  const m = pageUrl.match(/fragrantica\.[a-z.]+\/perfume\/.*-(\d+)\.html/i);
  return m ? `https://fimgs.net/mdimg/perfume/375x500.${m[1]}.jpg` : null;
}

/** Récupère og:image / twitter:image / JSON-LD image d'une page produit. */
export async function extractImagesFromPage(pageUrl: string): Promise<string[]> {
  const found = new Set<string>();
  const fromFragrantica = fragranticaImage(pageUrl);
  if (fromFragrantica) found.add(fromFragrantica);

  try {
    const res = await fetch(pageUrl, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return [...found];
    const html = (await res.text()).slice(0, 600_000);

    const metaRe = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi;
    for (const tag of html.match(metaRe) ?? []) {
      const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
      if (content) found.add(absolutize(content, pageUrl));
    }
    const ldRe = /"image"\s*:\s*(?:\[\s*)?"([^"]+)"/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = ldRe.exec(html)) && count++ < 3) found.add(absolutize(m[1].replace(/\\\//g, "/"), pageUrl));
  } catch {
    // Page inaccessible : on garde ce qu'on a.
  }
  return [...found].filter((u) => /^https?:\/\//.test(u));
}

function absolutize(url: string, base: string) {
  try {
    return new URL(url.replace(/&amp;/g, "&"), base).toString();
  } catch {
    return url;
  }
}

export async function downloadImage(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "image/*" },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) throw new Error("Le lien ne pointe pas vers une image");
  const data = await res.arrayBuffer();
  if (data.byteLength > MAX_BYTES) throw new Error("Image trop lourde (> 8 Mo)");
  return { data, contentType };
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Envoie l'image dans le bucket « bottles » et renvoie son URL publique. */
export async function uploadBottle(
  supabase: SupabaseClient,
  id: string,
  data: ArrayBuffer | Blob,
  contentType: string,
): Promise<string> {
  const path = `${id}.${EXT[contentType] ?? "jpg"}`;
  const { error } = await supabase.storage.from("bottles").upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Stockage : ${error.message}`);
  const { data: pub } = supabase.storage.from("bottles").getPublicUrl(path);
  return `${pub.publicUrl}?v=${Date.now()}`;
}
