import Link from "next/link";
import type { Layering, OlfactothequeDB, Region } from "@/lib/types";
import { ROLE_LABELS, TIME_LABELS } from "@/lib/labels";
import { componentName, familyColor } from "@/lib/client/lookup";
import { BottleImage } from "./BottleImage";
import { MonthStrip } from "./MonthStrip";

const STATUS_STYLE: Record<string, string> = {
  validé: "bg-ok/12 text-ok",
  recommandé: "bg-soft text-ink-2",
  "à tester": "bg-[#9fb4ff]/25 text-[#3b4fc4]",
  déconseillé: "bg-danger/10 text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLE[status] ?? ""}`}>
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
  const items = layering.components.map((c) => {
    const perfume = c.type === "perfume" ? db.perfumes.find((p) => p.id === c.ref) : undefined;
    const oil = c.type === "oil" ? db.oils.find((o) => o.id === c.ref) : undefined;
    return { c, perfume, oil, name: componentName(db, c) };
  });
  const mainColor = familyColor(db, items.find((i) => i.perfume)?.perfume?.family);

  return (
    <article className="flex flex-col rounded-4xl bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {!actions && <StatusBadge status={layering.status} />}
          {layering.signature && (
            <span className="aura rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-ink">★ Signature</span>
          )}
          {layering.time_of_day?.map((t) => (
            <span key={t} className="rounded-full bg-soft px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
              {TIME_LABELS[t]}
            </span>
          ))}
        </div>
        {actions}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex -space-x-4">
          {items.map(({ c, perfume, oil, name }, i) => (
            <BottleImage
              key={`${c.ref}-${i}`}
              name={name}
              family={perfume?.family ?? (oil ? "ambre" : undefined)}
              imageUrl={perfume?.image_url ?? oil?.image_url}
              families={db.families}
              size="sm"
              className="h-16 w-16 shrink-0 rounded-full ring-4 ring-card"
            />
          ))}
        </div>
        <ol className="min-w-0 flex-1 space-y-0.5">
          {items.map(({ c, perfume, name }, i) => (
            <li key={`${c.ref}-${i}`} className="flex items-baseline gap-2 text-[13.5px]">
              <span className="w-12 shrink-0 text-[11px] font-medium text-muted">
                {c.type === "oil" ? "Huile" : ROLE_LABELS[c.role]}
              </span>
              {perfume ? (
                <Link href={`/collection/${perfume.id}`} className="truncate font-semibold tracking-tight hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="truncate font-semibold tracking-tight">{name}</span>
              )}
              {c.dose && <span className="shrink-0 text-[11.5px] text-muted">{c.dose}</span>}
            </li>
          ))}
        </ol>
      </div>

      {layering.goal && layering.goal !== "—" && (
        <p className="title text-[22px] first-letter:uppercase">{layering.goal}</p>
      )}
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{layering.rationale}</p>
      {layering.dosage && <p className="mt-2 text-[12.5px] text-muted">{layering.dosage}</p>}

      {layering.wear && region && (
        <div className="mt-auto pt-4">
          <MonthStrip months={layering.wear[region].months} current={month} compact color={mainColor} />
        </div>
      )}
    </article>
  );
}
