export function Chip({
  active = false,
  children,
  onClick,
  className = "",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const base = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors";
  const style = active ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-ink-2";
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${base} ${style} ${className}`}>
      {children}
    </button>
  ) : (
    <span className={`${base} ${style} ${className}`}>{children}</span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-line-2 bg-card p-0.5 text-[13px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-3.5 py-1.5 transition-colors ${
            value === o.value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FamilyDot({ color, className = "" }: { color: string; className?: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${className}`} style={{ background: color }} />;
}
