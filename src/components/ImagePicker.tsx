"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { postJSON } from "@/lib/client/prefs";

/** Recherche de photos de flacon + saisie d'URL. Appelle onPick avec l'URL choisie. */
export function ImagePicker({
  name,
  house,
  pages,
  selected,
  onPick,
  autoSearch = false,
}: {
  name: string;
  house: string;
  pages?: string[];
  selected?: string | null;
  onPick: (url: string) => void;
  autoSearch?: boolean;
}) {
  const [images, setImages] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(autoSearch);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [broken, setBroken] = useState<Set<string>>(new Set());

  async function fetchImages() {
    try {
      const res = await postJSON<{ images: string[] }>("/api/images/find", { name, house, pages });
      setImages(res.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function search() {
    setLoading(true);
    setError(null);
    void fetchImages();
  }

  useEffect(() => {
    // setState n'intervient qu'après la requête (asynchrone).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoSearch) void fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = (images ?? []).filter((u) => !broken.has(u));

  return (
    <div>
      {!images && !loading && (
        <button type="button" onClick={search} className="rounded-full border border-line-2 bg-card px-4 py-2 text-sm hover:border-ink">
          Chercher les photos officielles
        </button>
      )}
      {loading && <p className="breathe text-sm text-muted">Recherche des photos…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {images && !loading && (
        <>
          {visible.length === 0 ? (
            <p className="text-sm text-muted">Aucune photo trouvée. Colle une URL d&apos;image ci-dessous.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {visible.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onPick(url)}
                  className={`aspect-[3/4] overflow-hidden rounded-xl border bg-white p-1.5 transition ${
                    selected === url ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink-2"
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setBroken((b) => new Set(b).add(url))}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={search} className="mt-2 text-[12px] text-muted hover:text-ink">
            Relancer la recherche
          </button>
        </>
      )}
      <div className="mt-4 flex gap-2">
        <input
          type="url"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="…ou colle l'URL d'une image"
          className="min-w-0 flex-1 border-b border-line-2 bg-transparent py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="button"
          disabled={!/^https?:\/\//.test(manual)}
          onClick={() => onPick(manual)}
          className="rounded-full border border-line-2 px-3 text-sm disabled:opacity-30"
        >
          Utiliser
        </button>
      </div>
    </div>
  );
}
