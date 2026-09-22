"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OlfactothequeDB, Perfume } from "@/lib/types";
import { postJSON } from "@/lib/client/prefs";
import { PerfumeEditor } from "@/components/PerfumeEditor";

export function EditPerfume({ db, perfume }: { db: OlfactothequeDB; perfume: Perfume }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && <p className="mb-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <PerfumeEditor
        db={db}
        initial={perfume}
        saving={saving}
        submitLabel="Enregistrer"
        onSubmit={async ({ perfume: next, newNotes }) => {
          setSaving(true);
          setError(null);
          try {
            await postJSON("/api/perfumes", { perfume: next, new_notes: newNotes, create: false });
            router.push(`/collection/${perfume.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
            setSaving(false);
          }
        }}
      />
    </>
  );
}
