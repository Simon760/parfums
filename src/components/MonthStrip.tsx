import { MONTH_SHORT, SCORE_LABELS } from "@/lib/labels";

const HEIGHT = ["12%", "38%", "68%", "100%"];

/** Mini histogramme des 12 mois : hauteur = score (0 à 3). */
export function MonthStrip({
  months,
  current,
  compact = false,
  color = "#0d0e12",
  onChange,
}: {
  months: number[];
  current?: number;
  compact?: boolean;
  color?: string;
  onChange?: (month: number, score: number) => void;
}) {
  return (
    <div className={`grid grid-cols-12 ${compact ? "gap-[3px]" : "gap-1.5"}`}>
      {months.map((score, i) => {
        const isCurrent = i === current;
        const bar = (
          <>
            <span className={`flex items-end ${compact ? "h-6" : "h-14"}`}>
              <span
                className={`mx-auto block rounded-full transition-all ${compact ? "w-full max-w-[7px]" : "w-full max-w-[18px]"}`}
                style={{
                  height: HEIGHT[score] ?? HEIGHT[0],
                  background: score === 0 ? "var(--line)" : color,
                  opacity: score === 0 ? 1 : 0.35 + score * 0.2,
                  boxShadow: isCurrent ? `0 0 0 2px var(--card), 0 0 0 3.5px ${color}` : undefined,
                }}
              />
            </span>
            {!compact && (
              <span className={`mt-1.5 block text-center text-[10px] font-medium ${isCurrent ? "text-ink" : "text-muted"}`}>
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
            className="cursor-pointer rounded-lg px-0.5 pt-1 hover:bg-soft"
          >
            {bar}
          </button>
        ) : (
          <span key={i} title={title}>
            {bar}
          </span>
        );
      })}
    </div>
  );
}
