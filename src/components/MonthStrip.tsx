import { MONTH_SHORT, SCORE_LABELS } from "@/lib/labels";

const SCORE_STYLE = ["bg-transparent border border-line-2", "bg-ink/15", "bg-ink/45", "bg-ink"];

/** 12 pastilles : intensité = score du mois (0 à 3). */
export function MonthStrip({
  months,
  current,
  compact = false,
  onChange,
}: {
  months: number[];
  current?: number;
  compact?: boolean;
  onChange?: (month: number, score: number) => void;
}) {
  return (
    <div className={`grid grid-cols-12 ${compact ? "gap-[3px]" : "gap-1"}`}>
      {months.map((score, i) => {
        const cell = (
          <>
            <span
              className={`block w-full rounded-full ${compact ? "h-1.5" : "h-2.5"} ${SCORE_STYLE[score] ?? SCORE_STYLE[0]}`}
            />
            {!compact && (
              <span className={`mt-1 block text-center text-[10px] ${i === current ? "font-semibold text-ink" : "text-muted"}`}>
                {MONTH_SHORT[i]}
              </span>
            )}
          </>
        );
        const title = `${MONTH_SHORT[i]} · ${SCORE_LABELS[score]}`;
        return onChange ? (
          <button
            key={i}
            type="button"
            title={title}
            onClick={() => onChange(i, (score + 1) % 4)}
            className="cursor-pointer rounded py-1 hover:bg-paper-2"
          >
            {cell}
          </button>
        ) : (
          <span key={i} title={title} className={i === current && compact ? "rounded-full ring-1 ring-accent ring-offset-1 ring-offset-card" : ""}>
            {cell}
          </span>
        );
      })}
    </div>
  );
}
