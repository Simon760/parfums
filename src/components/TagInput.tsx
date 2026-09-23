"use client";

import { useId, useState } from "react";

/** Liste de tags éditable : Entrée ou virgule pour ajouter, × pour retirer. */
export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions,
  display = (v) => v,
  toValue = (input) => input,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  display?: (value: string) => string;
  /** Convertit la saisie en valeur (ex. nom de note → id). null = refuser. */
  toValue?: (input: string) => string | null;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function commit(raw = draft) {
    const text = raw.trim().replace(/,$/, "");
    if (!text) return;
    const value = toValue(text);
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-soft px-3 py-2 focus-within:ring-2 focus-within:ring-ink/10">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-2.5 pr-1.5 text-[13px] font-medium shadow-soft">
          {display(v)}
          <button
            type="button"
            aria-label={`Retirer ${display(v)}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={suggestions ? listId : undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit()}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-muted"
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
