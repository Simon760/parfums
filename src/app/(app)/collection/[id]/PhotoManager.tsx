"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OlfactothequeDB, Perfume } from "@/lib/types";
import { BottleImage } from "@/components/BottleImage";
import { ImagePicker } from "@/components/ImagePicker";

export function PhotoManager({ perfume, families }: { perfume: Perfume; families: OlfactothequeDB["families"] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(init: RequestInit) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/perfumes/${perfume.id}/image`, { method: "POST", ...init });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Échec de l'enregistrement");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <BottleImage
        name={perfume.name}
        family={perfume.family}
        imageUrl={perfume.image_url}
        families={families}
        size="lg"
        className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-[520px]"
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="glass absolute right-4 top-4 rounded-full px-3.5 py-2 text-[12.5px] font-semibold shadow-soft"
      >
        {open ? "Fermer" : perfume.image_url ? "Changer la photo" : "Ajouter une photo"}
      </button>

      {open && (
        <div className="rise absolute inset-x-3 top-16 z-10 max-h-[80%] overflow-y-auto rounded-3xl bg-card p-4 shadow-lift">
          {busy ? (
            <p className="pulse-soft text-sm text-muted">Enregistrement…</p>
          ) : (
            <>
              <ImagePicker
                name={perfume.name}
                house={perfume.house}
                onPick={(url) => save({ headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) })}
              />
              <label className="mt-4 block cursor-pointer text-sm text-ink-2 hover:text-ink">
                <span className="font-medium underline underline-offset-4">Importer depuis l&apos;appareil</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    save({ body: form });
                  }}
                />
              </label>
            </>
          )}
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
