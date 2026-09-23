"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OlfactothequeDB, OwnedFormat, Perfume } from "@/lib/types";
import type { Candidate, Enrichment } from "@/lib/ai/importer";
import { OWNED_FORMATS } from "@/lib/labels";
import { postJSON } from "@/lib/client/prefs";
import { componentName } from "@/lib/client/lookup";
import { slugify } from "@/lib/recommend";
import { Chip } from "@/components/Chip";
import { ImagePicker } from "@/components/ImagePicker";
import { PerfumeEditor } from "@/components/PerfumeEditor";
import { StatusBadge } from "@/components/LayeringCard";

type Step = "search" | "enrich" | "review";

const ENRICH_MESSAGES = [
  "Recherche de la pyramide officielle…",
  "Lecture des fiches Fragrantica et des avis…",
  "Calcul des mois idéaux à Dubaï et en France…",
  "Comparaison avec ta collection…",
  "Idées de layerings avec tes parfums et huiles…",
  "Finalisation de la fiche…",
];

export function ImportWizard({ db }: { db: OlfactothequeDB }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [ownedFormat, setOwnedFormat] = useState<OwnedFormat>("original");
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [keepSimilar, setKeepSimilar] = useState<Set<number>>(new Set());
  const [keepLayerings, setKeepLayerings] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (step !== "enrich") return;
    const t = setInterval(() => setTick((n) => n + 1), 9000);
    return () => clearInterval(t);
  }, [step]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCandidates(null);
    try {
      const res = await postJSON<{ candidates: Candidate[] }>("/api/import/search", { query });
      setCandidates(res.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function enrich() {
    if (!candidate) return;
    setStep("enrich");
    setTick(0);
    setError(null);
    try {
      const res = await postJSON<Enrichment>("/api/import/enrich", { candidate, owned_format: ownedFormat });
      setEnrichment(res);
      setKeepSimilar(new Set(res.similarities.map((_, i) => i)));
      setKeepLayerings(new Set(res.layerings.map((_, i) => i)));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setStep("search");
    }
  }

  function manual() {
    const name = query.trim() || "Nouveau parfum";
    setEnrichment({
      perfume: blankPerfume(db, name, ownedFormat),
      new_notes: [],
      similarities: [],
      layerings: [],
      sources: [],
      image_pages: [],
    });
    setStep("review");
  }

  async function save(perfume: Perfume, newNotes: Enrichment["new_notes"]) {
    if (!enrichment) return;
    setSaving(true);
    setError(null);
    try {
      const res = await postJSON<{ id: string; warnings: string[] }>("/api/perfumes", {
        create: true,
        perfume,
        new_notes: newNotes,
        similarities: enrichment.similarities.filter((_, i) => keepSimilar.has(i)),
        layerings: enrichment.layerings
          .filter((_, i) => keepLayerings.has(i))
          .map((l) => ({ ...l, components: l.components.map((c) => (c.ref === enrichment.perfume.id ? { ...c, ref: perfume.id } : c)) })),
        image_source_url: image,
      });
      if (res.warnings.length) alert(res.warnings.join("\n"));
      router.push(`/collection/${res.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="rise mx-auto max-w-3xl">
      <p className="label mb-1">Nouveau parfum</p>
      <h1 className="title mb-8 text-[44px] md:text-[80px]">Ajouter</h1>

      <Steps step={step} />

      {error && <p className="mb-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {step === "search" && (
        <>
          <form onSubmit={search}>
            <label htmlFor="q" className="label">
              Nom et maison
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-full bg-card p-2 pl-6 shadow-soft">
              <input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Aventus Creed"
                className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-muted/50 md:text-2xl"
              />
              <button
                disabled={loading || query.trim().length < 2}
                className="h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-25"
              >
                {loading ? "Recherche…" : "Chercher"}
              </button>
            </div>
          </form>

          {loading && <p className="pulse-soft mt-8 text-sm text-muted">Je cherche ce parfum sur le web…</p>}

          {candidates && !loading && (
            <div className="mt-10">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">Aucun résultat. Précise le nom ou la maison.</p>
              ) : (
                <>
                  <p className="label mb-3">Lequel ?</p>
                  <ul className="space-y-3">
                    {candidates.map((c, i) => {
                      const active = candidate === c;
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => setCandidate(c)}
                            className={`w-full rounded-4xl bg-card p-5 text-left shadow-soft transition ${
                              active ? "ring-2 ring-ink" : "hover:shadow-lift"
                            }`}
                          >
                            <p className="label">
                              {[c.house, c.year, c.concentration].filter(Boolean).join(" · ")}
                            </p>
                            <p className="title mt-1 text-[28px]">{c.name}</p>
                            <p className="mt-1.5 text-sm text-ink-2">{c.description}</p>
                            {db.perfumes.some((p) => slugify(p.name) === slugify(c.name) && slugify(p.house) === slugify(c.house)) && (
                              <p className="mt-2 text-[12px] text-[#3b4fc4]">Déjà dans ta collection</p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {candidate && (
                <div className="rise mt-6 rounded-4xl bg-card p-5 shadow-soft">
                  <p className="label mb-3">Tu l&apos;as en</p>
                  <div className="flex flex-wrap gap-2">
                    {OWNED_FORMATS.map((f) => (
                      <Chip key={f} active={ownedFormat === f} onClick={() => setOwnedFormat(f)}>
                        {f}
                      </Chip>
                    ))}
                  </div>
                  <button onClick={enrich} className="mt-6 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white">
                    Construire la fiche
                  </button>
                  <p className="mt-2 text-center text-[12px] text-muted">
                    Recherche web + analyse avec ta collection · 1 à 3 minutes
                  </p>
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={manual} className="mt-10 text-sm text-muted underline underline-offset-4 hover:text-ink">
            Remplir la fiche à la main
          </button>
        </>
      )}

      {step === "enrich" && (
        <div className="py-16 text-center">
          <p className="title mb-4 text-[44px]">{candidate?.name}</p>
          <p key={tick} className="rise text-sm text-ink-2">
            {ENRICH_MESSAGES[Math.min(tick, ENRICH_MESSAGES.length - 1)]}
          </p>
          <div className="shimmer mx-auto mt-8 h-1.5 w-56 rounded-full" />
        </div>
      )}

      {step === "review" && enrichment && (
        <div className="space-y-4">
          <section className="rounded-4xl bg-card p-5 shadow-soft md:p-7">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Photo</h2>
            <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-soft">
                {image ? (
                  <img src={image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-muted">
                    Visuel généré si aucune photo
                  </div>
                )}
              </div>
              <ImagePicker
                name={enrichment.perfume.name}
                house={enrichment.perfume.house}
                pages={[
                  ...enrichment.image_pages,
                  ...(candidate?.official_url ? [candidate.official_url] : []),
                  ...(candidate?.fragrantica_url ? [candidate.fragrantica_url] : []),
                ].filter((u, i, all) => /^https?:\/\//.test(u) && all.indexOf(u) === i).slice(0, 8)}
                selected={image}
                onPick={setImage}
                autoSearch={enrichment.image_pages.length > 0 || !!candidate}
              />
            </div>
          </section>

          {enrichment.similarities.length > 0 && (
            <section className="rounded-4xl bg-card p-5 shadow-soft md:p-7">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Liens avec ta collection</h2>
              <ul className="space-y-2">
                {enrichment.similarities.map((s, i) => (
                  <li key={i}>
                    <Toggle
                      checked={keepSimilar.has(i)}
                      onChange={() => setKeepSimilar(toggle(keepSimilar, i))}
                      title={`${db.perfumes.find((p) => p.id === s.b)?.name ?? s.b} · ${s.relation}`}
                      body={s.reason}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {enrichment.layerings.length > 0 && (
            <section className="rounded-4xl bg-card p-5 shadow-soft md:p-7">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Layerings à tester</h2>
              <ul className="space-y-2">
                {enrichment.layerings.map((l, i) => (
                  <li key={i}>
                    <Toggle
                      checked={keepLayerings.has(i)}
                      onChange={() => setKeepLayerings(toggle(keepLayerings, i))}
                      title={l.components
                        .map((c) => (c.ref === enrichment.perfume.id ? enrichment.perfume.name : componentName(db, c)))
                        .join(" → ")}
                      body={`${l.goal} — ${l.rationale}`}
                      badge={<StatusBadge status={l.status} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {enrichment.sources.length > 0 && (
            <section className="rounded-4xl bg-card p-5 shadow-soft md:p-7">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Sources</h2>
              <ul className="space-y-1 text-[13px]">
                {enrichment.sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-ink-2 underline-offset-4 hover:underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="title mb-4 mt-8 text-[28px] md:text-4xl">Vérifie la fiche</h2>
            <PerfumeEditor
              db={db}
              initial={enrichment.perfume as Perfume}
              initialNewNotes={enrichment.new_notes}
              saving={saving}
              submitLabel="Ajouter à la collection"
              onSubmit={({ perfume, newNotes }) => {
                const id = perfume.id || slugify(perfume.name).replace(/_/g, "");
                save({ ...perfume, id }, newNotes);
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function toggle(set: Set<number>, i: number) {
  const next = new Set(set);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

function Toggle({
  checked,
  onChange,
  title,
  body,
  badge,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  body: string;
  badge?: React.ReactNode;
}) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-3xl bg-soft p-4 transition ${checked ? "" : "opacity-50"}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 accent-[var(--ink)]" />
      <span>
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {title} {badge}
        </span>
        <span className="mt-0.5 block text-[13px] text-ink-2">{body}</span>
      </span>
    </label>
  );
}

function Steps({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "search", label: "Recherche" },
    { id: "enrich", label: "Analyse" },
    { id: "review", label: "Photo & vérification" },
  ];
  const index = steps.findIndex((s) => s.id === step);
  return (
    <ol className="mb-8 flex gap-2">
      {steps.map((s, i) => (
        <li key={s.id} className="flex-1">
          <span className={`block h-1.5 rounded-full ${i <= index ? "aura" : "bg-line"}`} />
          <span className={`mt-2 block text-[12px] font-medium ${i === index ? "text-ink" : "text-muted"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function blankPerfume(db: OlfactothequeDB, name: string, owned: OwnedFormat): Perfume {
  const base = slugify(name).replace(/_/g, "") || "parfum";
  let id = base;
  for (let i = 2; db.perfumes.some((p) => p.id === id); i++) id = `${base}${i}`;
  const months = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] as Perfume["wear"]["dubai"]["months"];
  return {
    id,
    name,
    house: "",
    year: null,
    perfumers: [],
    concentration: "EDP",
    owned_format: owned,
    family: "boise",
    family_label: "",
    accords: [],
    notes: { top: [], heart: [], base: [] },
    pyramid_note: null,
    performance: { sillage: 2, sillage_label: "Modéré", longevity_h: { min: 6, max: 8 } },
    application: { profile: "intense", sprays: { min: 2, max: 3 }, zones: ["cou", "pli du coude"], rules: ["peau nue", "ne pas frotter"] },
    wear: {
      time_of_day: ["day", "evening"],
      dubai: { months: [...months] as typeof months, best_months: [] },
      france: { months: [...months] as typeof months, best_months: [] },
    },
    occasions: ["daily"],
    perception_risk: { level: "faible", reason: null },
    recommended_oil: { oil: db.oils[0]?.id ?? "", reason: "" },
    summary: "",
  };
}
