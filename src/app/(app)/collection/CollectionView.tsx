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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-1">
            {db.perfumes.length} parfums · {db.oils.length} huiles
          </p>
          <h1 className="title text-[44px] md:text-[80px]">Collection</h1>
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

      <div className="mb-4 flex items-center gap-3 rounded-full bg-card px-5 shadow-soft focus-within:ring-2 focus-within:ring-ink/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, maison, note, accord…"
          className="h-13 w-full bg-transparent py-3.5 text-[15px] outline-none placeholder:text-muted"
        />
      </div>

      <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:px-0">
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Trier"
          className="ml-auto rounded-full bg-card px-4 py-2 text-[13px] font-medium shadow-soft outline-none"
        >
          <option value="recent">Récents</option>
          <option value="name">Nom</option>
          <option value="house">Maison</option>
          <option value="sillage">Sillage</option>
        </select>
      </div>

      {perfumes.length === 0 ? (
        <p className="rounded-3xl bg-card py-16 text-center text-muted shadow-soft">Aucun parfum ne correspond.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {perfumes.map((p) => {
            const color = familyColor(db, p.family);
            return (
              <Link
                key={p.id}
                href={`/collection/${p.id}`}
                className="group flex flex-col rounded-4xl bg-card p-2 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <BottleImage
                  name={p.name}
                  family={p.family}
                  imageUrl={p.image_url}
                  families={db.families}
                  className="aspect-[4/5] rounded-[26px]"
                />
                <div className="flex flex-1 flex-col px-2.5 pb-2 pt-3">
                  <p className="truncate text-[11.5px] font-medium text-muted">{p.house}</p>
                  <p className="title truncate text-[21px] md:text-2xl">{p.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-ink-2">
                    <FamilyDot color={color} className="h-2 w-2" />
                    <span className="truncate">{p.family_label}</span>
                  </p>
                  <div className="mt-3">
                    <MonthStrip months={p.wear[region].months} current={month} compact color={color} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">Sillage {SILLAGE_LABELS[p.performance.sillage].toLowerCase()}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {db.oils.length > 0 && !query && families.length === 0 && (
        <section className="mt-16">
          <h2 className="title mb-5 text-[28px] md:text-4xl">Huiles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {db.oils.map((o) => (
              <article key={o.id} className="rounded-4xl bg-card p-6 shadow-soft">
                <p className="label">{o.type}</p>
                <h3 className="title mt-1 text-[26px]">{o.name}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{o.profile}</p>
                <p className="mt-3 rounded-2xl bg-soft px-3 py-2.5 text-[12.5px] text-ink-2">
                  <span className="font-semibold text-ink">
                    {o.dosage.drops.min === o.dosage.drops.max ? o.dosage.drops.min : `${o.dosage.drops.min}–${o.dosage.drops.max}`}{" "}
                    goutte(s)
                  </span>{" "}
                  · {o.role}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
