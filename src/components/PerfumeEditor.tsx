"use client";

import { useMemo, useState } from "react";
import type { FamilyId, Note, NoteCategory, OlfactothequeDB, Perfume } from "@/lib/types";
import { OCCASIONS, OCCASION_LABELS, OWNED_FORMATS, REGION_LABELS, SILLAGE_LABELS } from "@/lib/labels";
import { slugify } from "@/lib/recommend";
import { Chip, Segmented } from "./Chip";
import { MonthStrip } from "./MonthStrip";
import { TagInput } from "./TagInput";

export interface EditorResult {
  perfume: Perfume;
  newNotes: Note[];
}

/** Formulaire complet d'une fiche parfum (édition et vérification d'import). */
export function PerfumeEditor({
  db,
  initial,
  initialNewNotes = [],
  saving,
  submitLabel,
  onSubmit,
}: {
  db: OlfactothequeDB;
  initial: Perfume;
  initialNewNotes?: Note[];
  saving: boolean;
  submitLabel: string;
  onSubmit: (result: EditorResult) => void;
}) {
  const [p, setP] = useState<Perfume>(initial);
  const [newNotes, setNewNotes] = useState<Note[]>(initialNewNotes);

  const set = <K extends keyof Perfume>(key: K, value: Perfume[K]) => setP((prev) => ({ ...prev, [key]: value }));

  const allNotes = useMemo(() => [...db.notes, ...newNotes], [db.notes, newNotes]);
  const noteById = useMemo(() => new Map(allNotes.map((n) => [n.id, n])), [allNotes]);
  const noteByName = useMemo(() => new Map(allNotes.map((n) => [n.name.toLowerCase(), n.id])), [allNotes]);

  const noteToValue = (input: string) => {
    const known = noteByName.get(input.toLowerCase());
    if (known) return known;
    const id = slugify(input);
    if (!id) return null;
    if (!noteById.has(id)) setNewNotes((n) => [...n, { id, name: input, category: "boise" }]);
    return id;
  };

  const usedNoteIds = new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base]);
  const pendingNotes = newNotes.filter((n) => usedNoteIds.has(n.id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ perfume: p, newNotes: pendingNotes });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Group title="Identité">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Nom">
            <Text value={p.name} onChange={(v) => set("name", v)} required />
          </Field>
          <Field label="Maison">
            <Text value={p.house} onChange={(v) => set("house", v)} required />
          </Field>
          <Field label="Année">
            <Text
              value={p.year?.toString() ?? ""}
              inputMode="numeric"
              onChange={(v) => set("year", v ? Number(v.replace(/\D/g, "")) || null : null)}
            />
          </Field>
          <Field label="Concentration">
            <Text value={p.concentration} onChange={(v) => set("concentration", v)} />
          </Field>
          <Field label="Format possédé">
            <select
              value={p.owned_format}
              onChange={(e) => set("owned_format", e.target.value as Perfume["owned_format"])}
              className="w-full mt-1.5 rounded-2xl bg-soft px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
            >
              {OWNED_FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Parfumeurs">
            <TagInput values={p.perfumers} onChange={(v) => set("perfumers", v)} placeholder="Nom, Entrée" />
          </Field>
        </div>
      </Group>

      <Group title="Famille & accords">
        <div className="mb-5 flex flex-wrap gap-2">
          {db.families.map((f) => (
            <Chip key={f.id} active={p.family === f.id} onClick={() => set("family", f.id as FamilyId)}>
              <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Libellé de famille">
            <Text value={p.family_label} onChange={(v) => set("family_label", v)} />
          </Field>
          <Field label="Accords">
            <TagInput values={p.accords} onChange={(v) => set("accords", v)} placeholder="boisé, ambré…" />
          </Field>
        </div>
      </Group>

      <Group title="Pyramide">
        <div className="space-y-5">
          {(["top", "heart", "base"] as const).map((level) => (
            <Field key={level} label={{ top: "Tête", heart: "Cœur", base: "Fond" }[level]}>
              <TagInput
                values={p.notes[level]}
                onChange={(v) => set("notes", { ...p.notes, [level]: v })}
                display={(id) => noteById.get(id)?.name ?? id}
                toValue={noteToValue}
                suggestions={allNotes.map((n) => n.name)}
                placeholder="Tape une note…"
              />
            </Field>
          ))}
        </div>
        {pendingNotes.length > 0 && (
          <div className="mt-5 rounded-3xl bg-[#9fb4ff]/15 p-4">
            <p className="label mb-3">Nouvelles notes — choisis leur catégorie</p>
            <ul className="space-y-2">
              {pendingNotes.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{n.name}</span>
                  <select
                    value={n.category}
                    onChange={(e) =>
                      setNewNotes((all) =>
                        all.map((x) => (x.id === n.id ? { ...x, category: e.target.value as NoteCategory } : x)),
                      )
                    }
                    className="rounded-full border border-line bg-card px-3 py-1 text-[13px]"
                  >
                    {db.note_categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Field label="Remarque sur la pyramide" className="mt-5">
          <Text value={p.pyramid_note ?? ""} onChange={(v) => set("pyramid_note", v || null)} />
        </Field>
      </Group>

      <Group title="Performance & application">
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
          <Field label="Sillage">
            <div className="flex flex-wrap gap-2 pt-1">
              {[1, 2, 3, 4].map((n) => (
                <Chip
                  key={n}
                  active={p.performance.sillage === n}
                  onClick={() =>
                    set("performance", { ...p.performance, sillage: n as 1 | 2 | 3 | 4, sillage_label: SILLAGE_LABELS[n] })
                  }
                >
                  {SILLAGE_LABELS[n]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Tenue (heures)">
            <Range
              min={p.performance.longevity_h.min}
              max={p.performance.longevity_h.max}
              onChange={(min, max) => set("performance", { ...p.performance, longevity_h: { min, max } })}
            />
          </Field>
          <Field label="Profil d'application">
            <div className="pt-1">
              <Segmented
                value={p.application.profile}
                onChange={(v) => set("application", { ...p.application, profile: v })}
                options={[
                  { value: "frais", label: "Frais · zones larges" },
                  { value: "intense", label: "Intense · peau nue" },
                ]}
              />
            </div>
          </Field>
          <Field label="Sprays">
            <Range
              min={p.application.sprays.min}
              max={p.application.sprays.max}
              onChange={(min, max) => set("application", { ...p.application, sprays: { min, max } })}
            />
          </Field>
          <Field label="Zones">
            <TagInput values={p.application.zones} onChange={(v) => set("application", { ...p.application, zones: v })} />
          </Field>
          <Field label="Règles">
            <TagInput values={p.application.rules} onChange={(v) => set("application", { ...p.application, rules: v })} />
          </Field>
        </div>
      </Group>

      <Group title="Quand le porter">
        <p className="mb-4 text-[13px] text-muted">
          Touche un mois pour changer son score : vide = à éviter · clair = sous conditions · moyen = bon · plein = idéal.
        </p>
        <div className="space-y-6">
          {(["dubai", "france"] as const).map((r) => (
            <div key={r}>
              <p className="mb-1 text-sm font-medium">{REGION_LABELS[r]}</p>
              <MonthStrip
                months={p.wear[r].months}
                onChange={(i, score) => {
                  const months = [...p.wear[r].months] as Perfume["wear"]["dubai"]["months"];
                  months[i] = score as 0 | 1 | 2 | 3;
                  set("wear", { ...p.wear, [r]: { ...p.wear[r], months } });
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {(["day", "evening"] as const).map((t) => {
            const active = p.wear.time_of_day.includes(t);
            return (
              <Chip
                key={t}
                active={active}
                onClick={() => {
                  const next = active ? p.wear.time_of_day.filter((x) => x !== t) : [...p.wear.time_of_day, t];
                  if (next.length) set("wear", { ...p.wear, time_of_day: next });
                }}
              >
                {t === "day" ? "Jour" : "Soir"}
              </Chip>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => {
            const active = p.occasions.includes(o);
            return (
              <Chip
                key={o}
                active={active}
                onClick={() => set("occasions", active ? p.occasions.filter((x) => x !== o) : [...p.occasions, o])}
              >
                {OCCASION_LABELS[o]}
              </Chip>
            );
          })}
        </div>
      </Group>

      <Group title="Perception & huile">
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
          <Field label="Risque de perception">
            <div className="pt-1">
              <Segmented
                value={p.perception_risk.level}
                onChange={(level) => set("perception_risk", { ...p.perception_risk, level })}
                options={[
                  { value: "faible", label: "Faible" },
                  { value: "moyen", label: "Moyen" },
                  { value: "élevé", label: "Élevé" },
                ]}
              />
            </div>
          </Field>
          <Field label="Pourquoi">
            <Text
              value={p.perception_risk.reason ?? ""}
              onChange={(v) => set("perception_risk", { ...p.perception_risk, reason: v || null })}
            />
          </Field>
          <Field label="Huile conseillée">
            <select
              value={p.recommended_oil.oil}
              onChange={(e) => set("recommended_oil", { ...p.recommended_oil, oil: e.target.value })}
              className="w-full mt-1.5 rounded-2xl bg-soft px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
            >
              {db.oils.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Raison">
            <Text value={p.recommended_oil.reason} onChange={(v) => set("recommended_oil", { ...p.recommended_oil, reason: v })} />
          </Field>
        </div>
      </Group>

      <Group title="Résumé">
        <textarea
          value={p.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl bg-soft px-4 py-3 text-[17px] leading-relaxed outline-none focus:ring-2 focus:ring-ink/10"
        />
      </Group>

      <div className="sticky bottom-24 z-10 flex justify-end pt-2 md:bottom-6">
        <button
          disabled={saving || !p.name || !p.house}
          className="rounded-full bg-ink px-7 py-4 text-sm font-semibold text-white shadow-lift transition active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-4xl bg-card p-5 shadow-soft md:p-7">
      <legend className="float-left mb-5 w-full text-lg font-semibold tracking-tight">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function Text({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1.5 rounded-2xl bg-soft px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
    />
  );
}

function Range({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={0}
        value={min}
        onChange={(e) => onChange(num(e.target.value), Math.max(num(e.target.value), max))}
        className="w-20 mt-1.5 rounded-2xl bg-soft px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
      />
      <span className="text-muted">à</span>
      <input
        type="number"
        min={0}
        value={max}
        onChange={(e) => onChange(Math.min(min, num(e.target.value)), num(e.target.value))}
        className="w-20 mt-1.5 rounded-2xl bg-soft px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
      />
    </div>
  );
}
