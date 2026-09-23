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
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-[0.97]";
  const style = active ? "bg-ink text-white shadow-soft" : "bg-card text-ink-2 shadow-soft hover:text-ink";
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
  className = "",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-full bg-soft p-1 text-[13px] font-medium ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-4 py-1.5 transition-all ${
            value === o.value ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FamilyDot({ color, className = "" }: { color: string; className?: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} style={{ background: color }} />;
}

export function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-2"
      style={{ background: color ? `${color}26` : "var(--soft)" }}
    >
      {children}
    </span>
  );
}
