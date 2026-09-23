"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Supprimer ${name} ? Ses layerings et similarités seront aussi supprimés.`)) return;
    setBusy(true);
    const res = await fetch(`/api/perfumes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/collection");
      router.refresh();
    } else {
      setBusy(false);
      alert((await res.json().catch(() => ({}))).error ?? "Suppression impossible");
    }
  }

  return (
    <button onClick={remove} disabled={busy} className="rounded-full px-5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10">
      {busy ? "Suppression…" : "Supprimer"}
    </button>
  );
}
