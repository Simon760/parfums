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
    <div>
      <BottleImage
        name={perfume.name}
        family={perfume.family}
        imageUrl={perfume.image_url}
        families={families}
        size="lg"
        className="aspect-[4/3] rounded-3xl md:aspect-[4/5]"
      />
      <button type="button" onClick={() => setOpen(!open)} className="mt-3 text-[13px] text-muted hover:text-ink">
        {open ? "Fermer" : perfume.image_url ? "Changer la photo" : "Ajouter une photo"}
      </button>

      {open && (
        <div className="rise mt-3 rounded-2xl border border-line bg-card p-4">
          {busy ? (
            <p className="breathe text-sm text-muted">Enregistrement…</p>
          ) : (
            <>
              <ImagePicker
                name={perfume.name}
                house={perfume.house}
                onPick={(url) => save({ headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) })}
              />
              <label className="mt-4 block cursor-pointer text-sm text-ink-2 hover:text-ink">
                <span className="underline underline-offset-4">Importer depuis l&apos;appareil</span>
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
