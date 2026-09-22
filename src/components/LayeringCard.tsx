import Link from "next/link";
import type { Layering, OlfactothequeDB, Region } from "@/lib/types";
import { ROLE_LABELS, TIME_LABELS } from "@/lib/labels";
import { componentName } from "@/lib/client/lookup";
import { BottleImage } from "./BottleImage";
import { MonthStrip } from "./MonthStrip";

const STATUS_STYLE: Record<string, string> = {
  validé: "bg-ok/10 text-ok border-ok/30",
  recommandé: "bg-card text-ink-2 border-line-2",
  "à tester": "bg-accent/10 text-accent border-accent/30",
  déconseillé: "bg-danger/10 text-danger border-danger/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] tracking-wide ${STATUS_STYLE[status] ?? ""}`}>
      {status}
    </span>
  );
}

export function LayeringCard({
  db,
  layering,
  region,
  month,
  actions,
}: {
  db: OlfactothequeDB;
  layering: Layering;
  region?: Region;
  month?: number;
  actions?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!actions && <StatusBadge status={layering.status} />}
          {layering.signature && <span className="eyebrow text-accent">Signature</span>}
          {layering.time_of_day?.map((t) => (
            <span key={t} className="text-[11px] text-muted">
              {TIME_LABELS[t]}
            </span>
          ))}
        </div>
        {actions}
      </div>

      <ol className="mb-4 flex flex-wrap items-center gap-2">
        {layering.components.map((c, i) => {
          const perfume = c.type === "perfume" ? db.perfumes.find((p) => p.id === c.ref) : null;
          const oil = c.type === "oil" ? db.oils.find((o) => o.id === c.ref) : null;
          const inner = (
            <span className="flex items-center gap-2.5 rounded-xl border border-line bg-paper py-1.5 pl-1.5 pr-3">
              <BottleImage
                name={componentName(db, c)}
                family={perfume?.family ?? (oil ? "ambre" : undefined)}
                imageUrl={perfume?.image_url ?? oil?.image_url}
                families={db.families}
                size="sm"
                className="h-10 w-8 shrink-0 rounded-lg"
              />
              <span className="leading-tight">
                <span className="block text-[13px] font-medium">{componentName(db, c)}</span>
                <span className="block text-[11px] text-muted">
                  {c.type === "oil" ? "Huile" : ROLE_LABELS[c.role]}
                  {c.dose ? ` · ${c.dose}` : ""}
                </span>
              </span>
            </span>
          );
          return (
            <li key={`${c.ref}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted">→</span>}
              {perfume ? <Link href={`/collection/${perfume.id}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>

      {layering.goal && layering.goal !== "—" && <p className="display mb-1.5 text-xl">{layering.goal}</p>}
      <p className="text-sm leading-relaxed text-ink-2">{layering.rationale}</p>
      {layering.dosage && <p className="mt-2 text-[13px] text-muted">{layering.dosage}</p>}

      {layering.wear && region && (
        <div className="mt-4 border-t border-line pt-3">
          <MonthStrip months={layering.wear[region].months} current={month} compact />
        </div>
      )}
    </article>
  );
}
