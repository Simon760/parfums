import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDB } from "@/lib/data";
import { familyColor } from "@/lib/client/lookup";
import { OCCASION_LABELS, REGION_LABELS, RISK_LABELS, SEASON_LABELS, TIME_LABELS } from "@/lib/labels";
import { layeringsWith } from "@/lib/types";
import { FamilyDot, Tag } from "@/components/Chip";
import { BottleImage } from "@/components/BottleImage";
import { MonthStrip } from "@/components/MonthStrip";
import { LayeringCard } from "@/components/LayeringCard";
import { PhotoManager } from "./PhotoManager";
import { DeleteButton } from "./DeleteButton";

export async function generateMetadata({ params }: PageProps<"/collection/[id]">): Promise<Metadata> {
  const { id } = await params;
  const db = await loadDB();
  return { title: db.perfumes.find((p) => p.id === id)?.name ?? "Parfum" };
}

export default async function PerfumePage({ params }: PageProps<"/collection/[id]">) {
  const { id } = await params;
  const db = await loadDB();
  const p = db.perfumes.find((x) => x.id === id);
  if (!p) notFound();

  const month = new Date().getMonth();
  const noteName = new Map(db.notes.map((n) => [n.id, n.name]));
  const oil = db.oils.find((o) => o.id === p.recommended_oil.oil);
  const similar = db.similarities
    .filter((s) => s.a === p.id || s.b === p.id)
    .map((s) => ({ ...s, other: db.perfumes.find((x) => x.id === (s.a === p.id ? s.b : s.a)) }))
    .filter((s) => s.other);
  const layerings = layeringsWith(db, p.id).sort((a, b) => Number(a.status === "déconseillé") - Number(b.status === "déconseillé"));

  const color = familyColor(db, p.family);
  const levels = [
    { key: "top", label: "Tête" },
    { key: "heart", label: "Cœur" },
    { key: "base", label: "Fond" },
  ] as const;

  return (
    <article className="rise space-y-4">
      <Link href="/collection" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        ← Collection
      </Link>

      {/* Hero */}
      <section className="grid overflow-hidden rounded-4xl bg-card shadow-soft md:grid-cols-2">
        <PhotoManager perfume={p} families={db.families} />
        <div className="flex flex-col p-6 md:p-10">
          <p className="label">
            {[p.house, p.year, p.concentration].filter(Boolean).join(" · ")}
          </p>
          <h1 className="title mt-2 text-[52px] md:text-[84px]">{p.name}</h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Tag color={color}>
              <FamilyDot color={color} className="mr-1.5 h-2 w-2" />
              {p.family_label}
            </Tag>
            {p.owned_format !== "inconnu" && <Tag>{p.owned_format}</Tag>}
            {p.accords.map((a) => (
              <Tag key={a}>{a}</Tag>
            ))}
          </div>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{p.summary}</p>
          {p.perfumers.length > 0 && <p className="mt-3 text-[13px] text-muted">Par {p.perfumers.join(", ")}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-8">
            <Link
              href={`/collection/${p.id}/modifier`}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Modifier la fiche
            </Link>
            <DeleteButton id={p.id} name={p.name} />
          </div>
        </div>
      </section>

      {/* Bento */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Pyramide" className="md:col-span-2">
          <div className="space-y-3">
            {levels.map(({ key, label }) => (
              <div key={key} className="flex gap-3">
                <span className="w-12 shrink-0 pt-1.5 text-[12px] font-medium text-muted">{label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {p.notes[key].length === 0 && <span className="pt-1 text-muted">—</span>}
                  {p.notes[key].map((n) => (
                    <span key={n} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-medium">
                      {noteName.get(n) ?? n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {p.pyramid_note && <p className="mt-4 text-[12px] leading-relaxed text-muted">{p.pyramid_note}</p>}
        </Card>

        <Card title="Tenue & sillage">
          <p className="text-[44px] font-semibold leading-none tracking-[-0.05em]">
            {p.performance.longevity_h.min}–{p.performance.longevity_h.max}
            <span className="ml-1 text-xl text-muted">h</span>
          </p>
          <div className="mt-5 flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className="h-2.5 flex-1 rounded-full"
                style={{ background: n <= p.performance.sillage ? color : "var(--soft)" }}
              />
            ))}
          </div>
          <p className="mt-2 text-[13px] font-semibold">{p.performance.sillage_label}</p>
        </Card>

        <Card title="Quand le porter" className="md:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            {(["dubai", "france"] as const).map((r) => (
              <div key={r}>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{REGION_LABELS[r]}</p>
                  <p className="text-[11.5px] text-muted">
                    {(p.wear[r].seasons ?? []).map((s) => SEASON_LABELS[s]).join(" · ")}
                  </p>
                </div>
                <MonthStrip months={p.wear[r].months} current={month} color={color} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {p.wear.time_of_day.map((t) => (
              <span key={t} className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white">
                {TIME_LABELS[t]}
              </span>
            ))}
            {p.occasions.map((o) => (
              <Tag key={o}>{OCCASION_LABELS[o]}</Tag>
            ))}
          </div>
        </Card>

        <Card title={`Application · ${p.application.profile}`}>
          <p className="text-[44px] font-semibold leading-none tracking-[-0.05em]">
            {p.application.sprays.min === p.application.sprays.max
              ? p.application.sprays.min
              : `${p.application.sprays.min}–${p.application.sprays.max}`}
            <span className="ml-1.5 text-xl text-muted">spray{p.application.sprays.max > 1 ? "s" : ""}</span>
          </p>
          <p className="mt-4 text-[13.5px] font-medium">{p.application.zones.join(", ")}</p>
          <ul className="mt-2 space-y-1 text-[12.5px] text-muted">
            {p.application.rules.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
        </Card>

        {p.perception_risk.level !== "faible" && (
          <Card title="Perception" className="bg-[#fff6e8]">
            <p className="text-[15px] font-semibold">{RISK_LABELS[p.perception_risk.level]}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{p.perception_risk.reason}</p>
          </Card>
        )}

        {oil && (
          <Card title="Huile conseillée">
            <p className="title text-[26px]">{oil.name}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{p.recommended_oil.reason}</p>
            <p className="mt-3 rounded-2xl bg-soft px-3 py-2.5 text-[12.5px] text-ink-2">{oil.dosage.method}</p>
          </Card>
        )}

        {similar.length > 0 && (
          <Card title="Dans ta collection" className={p.perception_risk.level !== "faible" ? "" : "md:col-span-2"}>
            <ul className="space-y-2">
              {similar.map((s) => (
                <li key={s.other!.id}>
                  <Link href={`/collection/${s.other!.id}`} className="flex gap-3 rounded-2xl bg-soft p-2 transition hover:bg-line/70">
                    <BottleImage
                      name={s.other!.name}
                      family={s.other!.family}
                      imageUrl={s.other!.image_url}
                      families={db.families}
                      size="sm"
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 py-0.5">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{s.other!.name}</span>
                        <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                          {s.relation === "complementaire" ? "complémentaire" : s.relation}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-2">{s.reason}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {layerings.length > 0 && (
        <section className="pt-8">
          <h2 className="title mb-4 text-[28px] md:text-4xl">Layerings avec {p.name}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {layerings.map((l) => (
              <LayeringCard key={l.id} db={db} layering={l} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-4xl bg-card p-6 shadow-soft ${className}`}>
      <h2 className="label mb-4">{title}</h2>
      {children}
    </section>
  );
}
