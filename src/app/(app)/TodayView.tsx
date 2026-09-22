"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Occasion, OlfactothequeDB, Region, TimeOfDay } from "@/lib/types";
import { MONTH_LABELS, OCCASIONS, OCCASION_LABELS, REGION_COORDS, REGION_LABELS, SCORE_LABELS } from "@/lib/labels";
import { layeringsForContext, suggestPerfumes, type Suggestion } from "@/lib/recommend";
import type { SuggestionResult } from "@/lib/ai/suggest";
import { useWeather } from "@/lib/client/weather";
import { postJSON, usePref } from "@/lib/client/prefs";
import { componentName } from "@/lib/client/lookup";
import { BottleImage } from "@/components/BottleImage";
import { Chip, Segmented } from "@/components/Chip";
import { LayeringCard } from "@/components/LayeringCard";

const MOOD_IDEAS = [
  "Grosse journée au bureau, envie d'être net et discret",
  "Rendez-vous ce soir, je veux laisser une trace",
  "Fatigué, envie de réconfort et de douceur",
  "Chaleur écrasante, rester frais toute la journée",
];

function nowIn(region: Region) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: REGION_COORDS[region].tz,
    hour: "numeric",
    month: "numeric",
    weekday: "long",
    day: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { hour: Number(get("hour")), month: Number(get("month")) - 1, weekday: get("weekday"), day: get("day") };
}

export function TodayView({ db }: { db: OlfactothequeDB }) {
  const [region, setRegion] = usePref<Region>("region", "dubai", ["dubai", "france"]);
  const now = nowIn(region);
  const [timeOverride, setTimeOverride] = useState<TimeOfDay | null>(null);
  const time: TimeOfDay = timeOverride ?? (now.hour >= 17 || now.hour < 4 ? "evening" : "day");
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const { weather, loading: weatherLoading } = useWeather(region);

  const ctx = { region, month: now.month, time, occasion, tempMax: weather?.tempMax ?? null };
  const suggestions = useMemo(
    () => suggestPerfumes(db, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, region, now.month, time, occasion, weather?.tempMax],
  );
  const layerings = useMemo(
    () => layeringsForContext(db, ctx).slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, region, now.month, time],
  );

  const [top, rest] = [suggestions.slice(0, 3), suggestions.slice(3, 9)];

  return (
    <div className="rise">
      <header className="mb-8 md:mb-12">
        <p className="eyebrow mb-3">
          {now.weekday} {now.day} {MONTH_LABELS[now.month]} · {REGION_COORDS[region].city}
        </p>
        <h1 className="display text-[44px] md:text-7xl">
          {time === "evening" ? (
            <>
              Ce soir, <span className="italic">on porte quoi&nbsp;?</span>
            </>
          ) : (
            <>
              Aujourd&apos;hui, <span className="italic">on porte quoi&nbsp;?</span>
            </>
          )}
        </h1>
      </header>

      {/* Contexte */}
      <section className="mb-8 flex flex-wrap items-center gap-3">
        <Segmented
          value={region}
          onChange={setRegion}
          options={[
            { value: "dubai", label: REGION_LABELS.dubai },
            { value: "france", label: REGION_LABELS.france },
          ]}
        />
        <Segmented
          value={time}
          onChange={(v) => setTimeOverride(v)}
          options={[
            { value: "day", label: "Jour" },
            { value: "evening", label: "Soir" },
          ]}
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-card px-3.5 py-1.5 text-[13px] text-ink-2">
          {weatherLoading ? (
            <span className="breathe">Météo…</span>
          ) : weather ? (
            <>
              <span className="font-medium text-ink">{Math.round(weather.temp ?? 0)}°</span>
              {weather.condition && <span>{weather.condition}</span>}
              <span className="text-muted">
                {Math.round(weather.tempMin ?? 0)}° / {Math.round(weather.tempMax ?? 0)}°
              </span>
            </>
          ) : (
            <span className="text-muted">Météo indisponible</span>
          )}
        </span>
      </section>

      <MoodBox db={db} region={region} month={now.month} time={time} weather={weather} />

      {/* Occasion */}
      <section className="mb-6">
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <Chip active={occasion === null} onClick={() => setOccasion(null)}>
            Toutes occasions
          </Chip>
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)}>
              {OCCASION_LABELS[o]}
            </Chip>
          ))}
        </div>
      </section>

      {/* Sélection */}
      <section className="mb-14">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="display text-3xl">La sélection</h2>
          <span className="eyebrow hidden md:inline">Selon le mois, le moment et la météo</span>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted">Rien d&apos;adapté avec ces critères.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {top.map((s, i) => (
              <SuggestionCard key={s.perfume.id} db={db} s={s} rank={i} />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <>
            <h3 className="eyebrow mb-3 mt-8">Aussi portables</h3>
            <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-6 md:px-0">
              {rest.map((s) => (
                <Link key={s.perfume.id} href={`/collection/${s.perfume.id}`} className="group w-28 shrink-0 md:w-auto">
                  <BottleImage
                    name={s.perfume.name}
                    family={s.perfume.family}
                    imageUrl={s.perfume.image_url}
                    families={db.families}
                    size="sm"
                    className="aspect-[3/4] rounded-xl transition-transform group-hover:-translate-y-0.5"
                  />
                  <p className="mt-2 truncate text-[13px] font-medium">{s.perfume.name}</p>
                  <p className="truncate text-[11px] text-muted">{SCORE_LABELS[s.monthScore]}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Layerings */}
      {layerings.length > 0 && (
        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="display text-3xl">Layerings du moment</h2>
            <Link href="/layerings" className="text-sm text-muted hover:text-ink">
              Tout voir →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {layerings.map((l) => (
              <LayeringCard key={l.id} db={db} layering={l} region={region} month={now.month} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SuggestionCard({ db, s, rank }: { db: OlfactothequeDB; s: Suggestion; rank: number }) {
  const p = s.perfume;
  const oil = db.oils.find((o) => o.id === p.recommended_oil.oil);
  return (
    <Link
      href={`/collection/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(29,27,24,0.35)]"
    >
      <BottleImage
        name={p.name}
        family={p.family}
        imageUrl={p.image_url}
        families={db.families}
        className="aspect-[4/3] md:aspect-[4/5]"
      />
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow mb-1">
          {rank === 0 ? "Premier choix" : `Option ${rank + 1}`} · {p.house}
        </p>
        <h3 className="display mb-3 text-[32px]">{p.name}</h3>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {s.reasons.slice(0, 3).map((r) => (
            <span key={r} className="rounded-full bg-paper-2 px-2.5 py-1 text-[11.5px] text-ink-2">
              {r}
            </span>
          ))}
        </div>
        <dl className="mt-auto space-y-1.5 text-[13px] text-ink-2">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted">Dose</dt>
            <dd>
              {p.application.sprays.min === p.application.sprays.max
                ? p.application.sprays.min
                : `${p.application.sprays.min}-${p.application.sprays.max}`}{" "}
              spray{p.application.sprays.max > 1 ? "s" : ""} · {p.application.zones.slice(0, 2).join(", ")}
            </dd>
          </div>
          {oil && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">Huile</dt>
              <dd>{oil.name}</dd>
            </div>
          )}
          {s.layering && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">Layering</dt>
              <dd>{s.layering.components.map((c) => componentName(db, c)).join(" + ")}</dd>
            </div>
          )}
        </dl>
        {s.tips[0] && <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">{s.tips[0]}</p>}
      </div>
    </Link>
  );
}

function MoodBox({
  db,
  region,
  month,
  time,
  weather,
}: {
  db: OlfactothequeDB;
  region: Region;
  month: number;
  time: TimeOfDay;
  weather: ReturnType<typeof useWeather>["weather"];
}) {
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionResult | null>(null);

  async function ask(text = mood) {
    if (text.trim().length < 2) return;
    setMood(text);
    setLoading(true);
    setError(null);
    try {
      setResult(await postJSON<SuggestionResult>("/api/suggest", { mood: text, region, month, time, weather }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-line bg-card p-5 md:p-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label htmlFor="mood" className="eyebrow">
          Ton mood
        </label>
        <textarea
          id="mood"
          rows={2}
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
          }}
          placeholder="Décris ta journée, ton humeur, qui tu vas voir…"
          className="display mt-2 w-full resize-none bg-transparent text-2xl leading-snug outline-none placeholder:text-muted/70 md:text-3xl"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
            {MOOD_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => ask(idea)}
                className="shrink-0 rounded-full border border-dashed border-line-2 px-3 py-1.5 text-[12px] text-muted hover:border-ink-2 hover:text-ink"
              >
                {idea}
              </button>
            ))}
          </div>
          <button
            disabled={loading || mood.trim().length < 2}
            className="ml-auto rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity disabled:opacity-30"
          >
            {loading ? "Réflexion…" : "Demander"}
          </button>
        </div>
      </form>

      {loading && (
        <p className="breathe mt-6 text-sm text-muted">
          Je parcours ta collection en croisant ton mood, le mois et la météo…
        </p>
      )}
      {error && <p className="mt-5 text-sm text-danger">{error}</p>}

      {result && !loading && (
        <div className="rise mt-7 border-t border-line pt-6">
          <p className="mb-6 text-[15px] leading-relaxed text-ink-2">{result.lecture}</p>
          <ol className="space-y-6">
            {result.choix.map((c, i) => {
              const perfume = c.type === "perfume" ? db.perfumes.find((p) => p.id === c.ref) : null;
              const layering = c.type === "layering" ? db.layerings.find((l) => l.id === c.ref) : null;
              const oil = c.huile ? db.oils.find((o) => o.id === c.huile) : null;
              const title = perfume ? perfume.name : layering?.components.map((x) => componentName(db, x)).join(" + ");
              const lead = perfume ?? (layering && db.perfumes.find((p) => layering.components.some((x) => x.ref === p.id)));
              return (
                <li key={`${c.ref}-${i}`} className="flex gap-4">
                  <BottleImage
                    name={title ?? ""}
                    family={lead?.family}
                    imageUrl={lead?.image_url}
                    families={db.families}
                    size="sm"
                    className="aspect-[3/4] w-20 shrink-0 rounded-xl md:w-24"
                  />
                  <div className="min-w-0">
                    <p className="eyebrow mb-0.5">
                      {i === 0 ? "Mon choix" : `Alternative ${i}`}
                      {layering ? " · layering" : perfume ? ` · ${perfume.house}` : ""}
                    </p>
                    {perfume ? (
                      <Link href={`/collection/${perfume.id}`} className="display text-[28px] hover:underline">
                        {title}
                      </Link>
                    ) : (
                      <p className="display text-[28px]">{title}</p>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.pourquoi}</p>
                    <p className="mt-2 text-[13px] text-ink">
                      {c.dosage}
                      {oil ? ` · huile ${oil.name} dessous` : ""}
                    </p>
                    {c.conseil && <p className="mt-1 text-[13px] text-muted">{c.conseil}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {result.a_eviter && (
            <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-[13px] text-ink-2">
              <span className="font-medium text-ink">À éviter · </span>
              {result.a_eviter}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
