import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDB } from "@/lib/data";
import { familyColor } from "@/lib/client/lookup";
import { OCCASION_LABELS, REGION_LABELS, RISK_LABELS, SEASON_LABELS, TIME_LABELS } from "@/lib/labels";
import { layeringsWith } from "@/lib/types";
import { FamilyDot } from "@/components/Chip";
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

  return (
    <article className="rise">
      <Link href="/collection" className="mb-6 inline-block text-sm text-muted hover:text-ink">
        ← Collection
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
        <div className="md:sticky md:top-24 md:self-start">
          <PhotoManager perfume={p} families={db.families} />
        </div>

        <div>
          <p className="eyebrow mb-2">
            {[p.house, p.year, p.concentration, p.owned_format !== "inconnu" ? p.owned_format : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="display text-6xl md:text-8xl">{p.name}</h1>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-2">
            <FamilyDot color={familyColor(db, p.family)} />
            {p.family_label}
            {p.perfumers.length > 0 && <span className="text-muted">· {p.perfumers.join(", ")}</span>}
          </p>
          <p className="display mt-6 text-2xl italic leading-snug text-ink-2 md:text-3xl">{p.summary}</p>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {p.accords.map((a) => (
              <span key={a} className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] text-ink-2">
                {a}
              </span>
            ))}
          </div>

          <Section title="Pyramide">
            <dl className="divide-y divide-line">
              {(["top", "heart", "base"] as const).map((level) => (
                <div key={level} className="grid grid-cols-[72px_1fr] gap-4 py-3">
                  <dt className="eyebrow pt-0.5">{{ top: "Tête", heart: "Cœur", base: "Fond" }[level]}</dt>
                  <dd className="text-[15px]">{p.notes[level].map((n) => noteName.get(n) ?? n).join(", ") || "—"}</dd>
                </div>
              ))}
            </dl>
            {p.pyramid_note && <p className="mt-3 text-[12.5px] text-muted">{p.pyramid_note}</p>}
          </Section>

          <Section title="Tenue & application">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-2">Sillage</p>
                <div className="mb-1.5 flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= p.performance.sillage ? "bg-ink" : "bg-line"}`} />
                  ))}
                </div>
                <p className="text-sm">{p.performance.sillage_label}</p>
                <p className="eyebrow mb-1 mt-4">Tenue</p>
                <p className="text-sm">
                  {p.performance.longevity_h.min}–{p.performance.longevity_h.max} h
                </p>
              </div>
              <div>
                <p className="eyebrow mb-2">Application · {p.application.profile}</p>
                <p className="text-sm">
                  {p.application.sprays.min === p.application.sprays.max
                    ? p.application.sprays.min
                    : `${p.application.sprays.min} à ${p.application.sprays.max}`}{" "}
                  spray{p.application.sprays.max > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-sm text-ink-2">{p.application.zones.join(", ")}</p>
                <ul className="mt-2 space-y-0.5 text-[13px] text-muted">
                  {p.application.rules.map((r) => (
                    <li key={r}>— {r}</li>
                  ))}
                </ul>
              </div>
            </div>
            {p.perception_risk.level !== "faible" && (
              <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">{RISK_LABELS[p.perception_risk.level]}. </span>
                {p.perception_risk.reason}
              </p>
            )}
          </Section>

          <Section title="Quand le porter">
            <div className="space-y-5">
              {(["dubai", "france"] as const).map((r) => (
                <div key={r}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-sm font-medium">{REGION_LABELS[r]}</p>
                    <p className="text-[12px] text-muted">
                      {(p.wear[r].seasons ?? []).map((s) => SEASON_LABELS[s]).join(" · ")}
                    </p>
                  </div>
                  <MonthStrip months={p.wear[r].months} current={month} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {p.wear.time_of_day.map((t) => (
                <span key={t} className="rounded-full bg-ink px-3 py-1 text-[12px] text-paper">
                  {TIME_LABELS[t]}
                </span>
              ))}
              {p.occasions.map((o) => (
                <span key={o} className="rounded-full bg-paper-2 px-3 py-1 text-[12px] text-ink-2">
                  {OCCASION_LABELS[o]}
                </span>
              ))}
            </div>
          </Section>

          {oil && (
            <Section title="Huile conseillée">
              <p className="display text-2xl">{oil.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{p.recommended_oil.reason}</p>
              <p className="mt-2 text-[13px] text-muted">{oil.dosage.method}</p>
            </Section>
          )}

          {similar.length > 0 && (
            <Section title="Dans la collection">
              <ul className="divide-y divide-line">
                {similar.map((s) => (
                  <li key={s.other!.id} className="py-3">
                    <Link href={`/collection/${s.other!.id}`} className="flex items-baseline justify-between gap-4 hover:underline">
                      <span className="display text-xl">{s.other!.name}</span>
                      <span className="eyebrow">{s.relation === "complementaire" ? "complémentaire" : s.relation}</span>
                    </Link>
                    <p className="mt-0.5 text-[13px] text-ink-2">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
            <Link href={`/collection/${p.id}/modifier`} className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper">
              Modifier la fiche
            </Link>
            <DeleteButton id={p.id} name={p.name} />
          </div>
        </div>
      </div>

      {layerings.length > 0 && (
        <section className="mt-16">
          <h2 className="display mb-6 text-4xl">Layerings avec {p.name}</h2>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4 border-b border-line pb-2 text-ink">{title}</h2>
      {children}
    </section>
  );
}
