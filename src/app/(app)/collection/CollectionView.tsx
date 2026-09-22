"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OlfactothequeDB, Region, TimeOfDay } from "@/lib/types";
import { REGION_LABELS, SILLAGE_LABELS } from "@/lib/labels";
import { usePref } from "@/lib/client/prefs";
import { familyColor } from "@/lib/client/lookup";
import { BottleImage } from "@/components/BottleImage";
import { Chip, FamilyDot, Segmented } from "@/components/Chip";
import { MonthStrip } from "@/components/MonthStrip";

type Sort = "recent" | "name" | "house" | "sillage";

export function CollectionView({ db }: { db: OlfactothequeDB }) {
  const month = new Date().getMonth();
  const [region, setRegion] = usePref<Region>("region", "dubai", ["dubai", "france"]);
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<string[]>([]);
  const [wearableNow, setWearableNow] = useState(false);
  const [time, setTime] = useState<TimeOfDay | null>(null);
  const [sort, setSort] = usePref<Sort>("sort", "recent", ["recent", "name", "house", "sillage"]);

  const noteName = useMemo(() => new Map(db.notes.map((n) => [n.id, n.name.toLowerCase()])), [db.notes]);

  const perfumes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = db.perfumes.filter((p) => {
      if (families.length && !families.includes(p.family)) return false;
      if (wearableNow && p.wear[region].months[month] < 2) return false;
      if (time && !p.wear.time_of_day.includes(time)) return false;
      if (!q) return true;
      const notes = [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => noteName.get(n) ?? n);
      return [p.name, p.house, p.family_label, ...p.accords, ...notes].some((s) => s.toLowerCase().includes(q));
    });
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (sort === "house") list.sort((a, b) => a.house.localeCompare(b.house, "fr") || a.name.localeCompare(b.name, "fr"));
    if (sort === "sillage") list.sort((a, b) => b.performance.sillage - a.performance.sillage);
    if (sort === "recent") list.reverse();
    return list;
  }, [db.perfumes, families, wearableNow, region, month, time, query, sort, noteName]);

  const toggleFamily = (id: string) =>
    setFamilies((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <div className="rise">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{db.perfumes.length} parfums · {db.oils.length} huiles</p>
          <h1 className="display text-5xl md:text-7xl">Collection</h1>
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

      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, maison, note, accord…"
          className="w-full border-b border-line-2 bg-transparent py-3 text-lg outline-none placeholder:text-muted focus:border-ink"
        />
      </div>

      <div className="scrollbar-none -mx-5 mb-3 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
        {db.families.map((f) => (
          <Chip key={f.id} active={families.includes(f.id)} onClick={() => toggleFamily(f.id)}>
            <FamilyDot color={f.color} />
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Chip active={wearableNow} onClick={() => setWearableNow(!wearableNow)}>
          Portable ce mois-ci
        </Chip>
        <Chip active={time === "day"} onClick={() => setTime(time === "day" ? null : "day")}>
          Jour
        </Chip>
        <Chip active={time === "evening"} onClick={() => setTime(time === "evening" ? null : "evening")}>
          Soir
        </Chip>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          Trier
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-line-2 bg-card px-3 py-1.5 text-ink outline-none"
          >
            <option value="recent">Récents</option>
            <option value="name">Nom</option>
            <option value="house">Maison</option>
            <option value="sillage">Sillage</option>
          </select>
        </label>
      </div>

      {perfumes.length === 0 ? (
        <p className="py-16 text-center text-muted">Aucun parfum ne correspond.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {perfumes.map((p) => (
            <Link key={p.id} href={`/collection/${p.id}`} className="group">
              <BottleImage
                name={p.name}
                family={p.family}
                imageUrl={p.image_url}
                families={db.families}
                className="aspect-[3/4] rounded-2xl transition-transform duration-300 group-hover:-translate-y-1"
              />
              <div className="mt-3 px-0.5">
                <p className="eyebrow truncate">{p.house}</p>
                <p className="display mt-0.5 truncate text-2xl">{p.name}</p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-muted">
                  <FamilyDot color={familyColor(db, p.family)} />
                  {p.family_label} · {SILLAGE_LABELS[p.performance.sillage]}
                </p>
                <div className="mt-2.5">
                  <MonthStrip months={p.wear[region].months} current={month} compact />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {db.oils.length > 0 && !query && families.length === 0 && (
        <section className="mt-20">
          <h2 className="display mb-6 text-4xl">Huiles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {db.oils.map((o) => (
              <article key={o.id} className="rounded-2xl border border-line bg-card p-5">
                <p className="eyebrow mb-1">{o.type}</p>
                <h3 className="display mb-2 text-2xl">{o.name}</h3>
                <p className="mb-3 text-sm leading-relaxed text-ink-2">{o.profile}</p>
                <p className="text-[13px] text-muted">{o.role}</p>
                <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
                  {o.dosage.drops.min === o.dosage.drops.max ? o.dosage.drops.min : `${o.dosage.drops.min}-${o.dosage.drops.max}`}{" "}
                  goutte(s) · {o.dosage.method}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
