"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Occasion, OlfactothequeDB, Region, TimeOfDay } from "@/lib/types";
import { MONTH_LABELS, OCCASIONS, OCCASION_LABELS, REGION_COORDS, REGION_LABELS, SCORE_LABELS } from "@/lib/labels";
import { layeringsForContext, suggestPerfumes, type Suggestion } from "@/lib/recommend";
import type { SuggestionResult } from "@/lib/ai/suggest";
import { useWeather, type Weather } from "@/lib/client/weather";
import { postJSON, usePref } from "@/lib/client/prefs";
import { componentName, familyColor } from "@/lib/client/lookup";
import { BottleImage } from "@/components/BottleImage";
import { Chip, Segmented, Tag } from "@/components/Chip";
import { LayeringCard } from "@/components/LayeringCard";

const MOOD_IDEAS = [
  "Journée bureau, net et discret",
  "Date ce soir, je veux marquer",
  "Fatigué, envie de douceur",
  "Canicule, rester frais",
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

/** Dégradé de la carte météo selon la température. */
function weatherGradient(t: number | null | undefined, evening: boolean) {
  if (evening) return "linear-gradient(145deg, #2b2d6e 0%, #6a4bc4 55%, #e58fb8 100%)";
  if (t == null) return "linear-gradient(145deg, #9fb4ff, #7be3d0)";
  if (t >= 32) return "linear-gradient(145deg, #ff7a59 0%, #ffb35c 55%, #ffd89e 100%)";
  if (t >= 22) return "linear-gradient(145deg, #ff9f8a 0%, #ffc58f 50%, #ffe6a8 100%)";
  if (t >= 12) return "linear-gradient(145deg, #57c7d4 0%, #7be3d0 50%, #c6f3c4 100%)";
  return "linear-gradient(145deg, #5b7cfa 0%, #8fb2ff 55%, #cfe1ff 100%)";
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

  const [hero, ...others] = suggestions;
  const alternatives = others.slice(0, 2);
  const rest = others.slice(2, 10);

  return (
    <div className="rise space-y-10 md:space-y-14">
      {/* En-tête */}
      <header className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label capitalize">
            {now.weekday} {now.day} {MONTH_LABELS[now.month]}
          </p>
          <Segmented
            value={region}
            onChange={setRegion}
            options={[
              { value: "dubai", label: REGION_LABELS.dubai },
              { value: "france", label: REGION_LABELS.france },
            ]}
          />
        </div>
        <h1 className="title text-[44px] md:text-[80px]">
          {time === "evening" ? "Ce soir," : "Aujourd'hui,"}
          <br />
          <span className="aura-text">on porte quoi&nbsp;?</span>
        </h1>
      </header>

      {/* Météo + mood */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <WeatherCard
          region={region}
          time={time}
          weather={weather}
          loading={weatherLoading}
          onTime={(t) => setTimeOverride(t)}
        />
        <MoodBox db={db} region={region} month={now.month} time={time} weather={weather} />
      </section>

      {/* Sélection */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="title text-[28px] md:text-4xl">La sélection</h2>
          <span className="label hidden md:inline">mois · moment · météo · occasion</span>
        </div>
        <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:px-0">
          <Chip active={occasion === null} onClick={() => setOccasion(null)}>
            Tout
          </Chip>
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)}>
              {OCCASION_LABELS[o]}
            </Chip>
          ))}
        </div>

        {!hero ? (
          <p className="rounded-3xl bg-card p-8 text-center text-muted shadow-soft">Rien d&apos;adapté avec ces critères.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <HeroPick db={db} s={hero} />
            <div className="grid gap-4">
              {alternatives.map((s, i) => (
                <AltPick key={s.perfume.id} db={db} s={s} rank={i + 2} />
              ))}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <>
            <h3 className="label mb-3 mt-8">Aussi dans le ton</h3>
            <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-8 md:px-0">
              {rest.map((s) => (
                <Link key={s.perfume.id} href={`/collection/${s.perfume.id}`} className="group w-28 shrink-0 md:w-auto">
                  <BottleImage
                    name={s.perfume.name}
                    family={s.perfume.family}
                    imageUrl={s.perfume.image_url}
                    families={db.families}
                    size="sm"
                    className="aspect-[4/5] rounded-2xl shadow-soft transition-transform duration-300 group-hover:-translate-y-1"
                  />
                  <p className="mt-2 truncate text-[13px] font-semibold tracking-tight">{s.perfume.name}</p>
                  <p className="truncate text-[11.5px] text-muted">{SCORE_LABELS[s.monthScore]}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Layerings */}
      {layerings.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="title text-[28px] md:text-4xl">Layerings du moment</h2>
            <Link href="/layerings" className="text-sm font-medium text-muted hover:text-ink">
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

function WeatherCard({
  region,
  time,
  weather,
  loading,
  onTime,
}: {
  region: Region;
  time: TimeOfDay;
  weather: Weather | null;
  loading: boolean;
  onTime: (t: TimeOfDay) => void;
}) {
  const evening = time === "evening";
  return (
    <div
      className="relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-4xl p-6 text-white shadow-lift"
      style={{ background: weatherGradient(weather?.tempMax, evening) }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-white/90">{REGION_COORDS[region].city}</p>
          <p className="text-[13px] text-white/75">{weather?.condition ?? (loading ? "…" : "météo indisponible")}</p>
        </div>
        <div className="flex rounded-full bg-white/20 p-1 text-[12.5px] font-semibold backdrop-blur">
          {(["day", "evening"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTime(t)}
              className={`rounded-full px-3 py-1 transition ${time === t ? "bg-white text-ink" : "text-white/85"}`}
            >
              {t === "day" ? "Jour" : "Soir"}
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex items-end justify-between">
        <p className={`text-[84px] font-semibold leading-none tracking-[-0.06em] ${loading ? "pulse-soft" : ""}`}>
          {weather?.temp != null ? `${Math.round(weather.temp)}°` : "—"}
        </p>
        {weather && (
          <p className="pb-2 text-right text-[13px] font-medium text-white/85">
            max {Math.round(weather.tempMax ?? 0)}°
            <br />
            min {Math.round(weather.tempMin ?? 0)}°
          </p>
        )}
      </div>
    </div>
  );
}

function doseLabel(s: Suggestion) {
  const { min, max } = s.perfume.application.sprays;
  return `${min === max ? min : `${min}–${max}`} spray${max > 1 ? "s" : ""}`;
}

function HeroPick({ db, s }: { db: OlfactothequeDB; s: Suggestion }) {
  const p = s.perfume;
  const color = familyColor(db, p.family);
  const oil = db.oils.find((o) => o.id === p.recommended_oil.oil);
  return (
    <Link
      href={`/collection/${p.id}`}
      className="group grid overflow-hidden rounded-4xl bg-card shadow-soft transition-shadow hover:shadow-lift sm:grid-cols-2"
    >
      <BottleImage
        name={p.name}
        family={p.family}
        imageUrl={p.image_url}
        families={db.families}
        size="lg"
        className="aspect-[4/3] sm:aspect-auto sm:min-h-[340px]"
      />
      <div className="flex flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">Pick du jour</span>
          <span className="label">{p.house}</span>
        </div>
        <h3 className="title text-[40px] md:text-5xl">{p.name}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{p.summary}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {s.reasons.slice(0, 3).map((r) => (
            <Tag key={r} color={color}>
              {r}
            </Tag>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
          <Stat label="Dose" value={doseLabel(s)} />
          <Stat label="Tenue" value={`${p.performance.longevity_h.min}–${p.performance.longevity_h.max} h`} />
          {oil && <Stat label="Huile" value={oil.name} />}
          {s.layering && <Stat label="Layering" value={s.layering.components.map((c) => componentName(db, c)).join(" + ")} />}
        </div>
        {s.tips[0] && <p className="mt-3 text-[12.5px] leading-relaxed text-muted">💡 {s.tips[0]}</p>}
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-soft px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="truncate text-[13.5px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AltPick({ db, s, rank }: { db: OlfactothequeDB; s: Suggestion; rank: number }) {
  const p = s.perfume;
  return (
    <Link
      href={`/collection/${p.id}`}
      className="group flex overflow-hidden rounded-4xl bg-card shadow-soft transition-shadow hover:shadow-lift"
    >
      <BottleImage
        name={p.name}
        family={p.family}
        imageUrl={p.image_url}
        families={db.families}
        size="sm"
        className="w-32 shrink-0 sm:w-40"
      />
      <div className="flex min-w-0 flex-col justify-center p-5">
        <p className="label">
          Option {rank} · {p.house}
        </p>
        <h3 className="title mt-1 truncate text-[28px]">{p.name}</h3>
        <p className="mt-1 text-[13px] text-ink-2">{s.reasons[0] ?? p.family_label}</p>
        <p className="mt-2 text-[12.5px] font-medium text-muted">
          {doseLabel(s)} · {p.application.zones.slice(0, 2).join(", ")}
        </p>
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
  weather: Weather | null;
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
    <div className="aura-border flex flex-col rounded-4xl p-5 shadow-soft md:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex flex-1 flex-col"
      >
        <label htmlFor="mood" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkle />
          Ton mood du moment
        </label>
        <textarea
          id="mood"
          rows={2}
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="Décris ta journée, ton humeur, qui tu vas voir…"
          className="mt-3 w-full flex-1 resize-none bg-transparent text-[22px] font-medium leading-snug tracking-tight outline-none placeholder:text-muted/60"
        />
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {MOOD_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => ask(idea)}
              className="shrink-0 rounded-full bg-soft px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:bg-line"
            >
              {idea}
            </button>
          ))}
        </div>
        <button
          disabled={loading || mood.trim().length < 2}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-25"
        >
          <Sparkle white />
          {loading ? "100bon réfléchit…" : "Demander à 100bon"}
        </button>
      </form>

      {loading && <div className="shimmer mt-4 h-1 rounded-full" />}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {result && !loading && (
        <div className="rise mt-6 space-y-3">
          <p className="text-[14px] leading-relaxed text-ink-2">{result.lecture}</p>
          {result.choix.map((c, i) => {
            const perfume = c.type === "perfume" ? db.perfumes.find((p) => p.id === c.ref) : null;
            const layering = c.type === "layering" ? db.layerings.find((l) => l.id === c.ref) : null;
            const oil = c.huile ? db.oils.find((o) => o.id === c.huile) : null;
            const title = perfume ? perfume.name : layering?.components.map((x) => componentName(db, x)).join(" + ");
            const lead = perfume ?? (layering && db.perfumes.find((p) => layering.components.some((x) => x.ref === p.id)));
            const body = (
              <div className="flex gap-4 rounded-3xl bg-soft p-3 transition hover:bg-line/70">
                <BottleImage
                  name={title ?? ""}
                  family={lead?.family}
                  imageUrl={lead?.image_url}
                  families={db.families}
                  size="sm"
                  className="aspect-[4/5] w-20 shrink-0 rounded-2xl"
                />
                <div className="min-w-0 py-1">
                  <p className="label">
                    {i === 0 ? "Mon choix" : `Alternative ${i}`}
                    {layering ? " · layering" : ""}
                  </p>
                  <p className="title text-[22px]">{title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{c.pourquoi}</p>
                  <p className="mt-1.5 text-[12.5px] font-semibold">
                    {c.dosage}
                    {oil ? ` · ${oil.name} dessous` : ""}
                  </p>
                  {c.conseil && <p className="mt-0.5 text-[12.5px] text-muted">{c.conseil}</p>}
                </div>
              </div>
            );
            return perfume ? (
              <Link key={`${c.ref}-${i}`} href={`/collection/${perfume.id}`} className="block">
                {body}
              </Link>
            ) : (
              <div key={`${c.ref}-${i}`}>{body}</div>
            );
          })}
          {result.a_eviter && (
            <p className="rounded-2xl bg-danger/8 px-4 py-3 text-[13px] text-ink-2">
              <span className="font-semibold text-danger">À éviter · </span>
              {result.a_eviter}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Sparkle({ white = false }: { white?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="sparkle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7be3d0" />
          <stop offset="0.5" stopColor="#9fb4ff" />
          <stop offset="1" stopColor="#ffb8d1" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.6 4.8 2.6 7.4 8 8-5.4.6-7.4 3.2-8 8-.6-4.8-2.6-7.4-8-8 5.4-.6 7.4-3.2 8-8z"
        fill={white ? "#fff" : "url(#sparkle)"}
      />
    </svg>
  );
}
