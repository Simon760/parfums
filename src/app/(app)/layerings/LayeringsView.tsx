"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LayeringStatus, OlfactothequeDB, Region } from "@/lib/types";
import { LAYERING_STATUSES, REGION_LABELS } from "@/lib/labels";
import { postJSON, usePref } from "@/lib/client/prefs";
import { componentName } from "@/lib/client/lookup";
import { Chip, Segmented } from "@/components/Chip";
import { LayeringCard } from "@/components/LayeringCard";

export function LayeringsView({ db }: { db: OlfactothequeDB }) {
  const router = useRouter();
  const month = new Date().getMonth();
  const [region, setRegion] = usePref<Region>("region", "dubai", ["dubai", "france"]);
  const [statuses, setStatuses] = useState<LayeringStatus[]>(["validé", "recommandé", "à tester"]);
  const [nowOnly, setNowOnly] = useState(false);
  const [signatureOnly, setSignatureOnly] = useState(false);
  const [ingredient, setIngredient] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const ingredients = useMemo(
    () =>
      [...db.perfumes.map((p) => ({ id: p.id, name: p.name })), ...db.oils.map((o) => ({ id: o.id, name: o.name }))].sort(
        (a, b) => a.name.localeCompare(b.name, "fr"),
      ),
    [db],
  );

  const list = db.layerings.filter((l) => {
    if (!statuses.includes(l.status)) return false;
    if (signatureOnly && !l.signature) return false;
    if (nowOnly && (!l.wear || l.wear[region].months[month] < 2)) return false;
    if (ingredient && !l.components.some((c) => c.ref === ingredient)) return false;
    return true;
  });
  const order: Record<LayeringStatus, number> = { validé: 0, recommandé: 1, "à tester": 2, déconseillé: 3 };
  list.sort((a, b) => Number(b.signature) - Number(a.signature) || order[a.status] - order[b.status]);

  async function setStatus(id: string, status: LayeringStatus) {
    setPending(id);
    try {
      await postJSON(`/api/layerings/${id}`, { status }, "PATCH");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rise">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-1">{db.layerings.length} combinaisons</p>
          <h1 className="title text-[44px] md:text-[80px]">Layerings</h1>
        </div>
        <Segmented
          value={region}
          onChange={setRegion}
          options={[
            { value: "dubai", label: REGION_LABELS.dubai },
            { value: "france", label: REGION_LABELS.france },
          ]}
        />
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        {LAYERING_STATUSES.map((s) => (
          <Chip
            key={s}
            active={statuses.includes(s)}
            onClick={() => setStatuses(statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s])}
          >
            {s}
          </Chip>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Chip active={nowOnly} onClick={() => setNowOnly(!nowOnly)}>
          Portable ce mois-ci
        </Chip>
        <Chip active={signatureOnly} onClick={() => setSignatureOnly(!signatureOnly)}>
          Signatures
        </Chip>
        <select
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          className="rounded-full bg-card px-4 py-2 text-[13px] font-medium shadow-soft outline-none"
        >
          <option value="">Avec n&apos;importe quel parfum</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              Avec {i.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[13px] text-muted">{list.length} résultat{list.length > 1 ? "s" : ""}</span>
      </div>

      {list.length === 0 ? (
        <p className="rounded-3xl bg-card py-16 text-center text-muted shadow-soft">Aucun layering ne correspond.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((l) => (
            <LayeringCard
              key={l.id}
              db={db}
              layering={l}
              region={region}
              month={month}
              actions={
                <select
                  aria-label={`Statut de ${l.components.map((c) => componentName(db, c)).join(" + ")}`}
                  value={l.status}
                  disabled={pending === l.id}
                  onChange={(e) => setStatus(l.id, e.target.value as LayeringStatus)}
                  className="rounded-full bg-soft px-3 py-1.5 text-[12px] font-semibold text-ink-2 outline-none"
                >
                  {LAYERING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
