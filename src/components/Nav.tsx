"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Aujourd'hui", icon: SunIcon },
  { href: "/collection", label: "Collection", icon: GridIcon },
  { href: "/layerings", label: "Layerings", icon: LayersIcon },
  { href: "/ajouter", label: "Ajouter", icon: PlusIcon },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop */}
      <header className="glass sticky top-0 z-30 hidden border-b border-white/60 md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <Logo />
          <nav className="flex gap-1 rounded-full bg-soft p-1 text-[13.5px] font-medium">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                  isActive(l.href) ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink"
                }`}
              >
                <l.icon active={isActive(l.href)} size={17} />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile : barre flottante */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <div className="glass flex w-full max-w-sm items-center justify-between rounded-full border border-white/70 p-1.5 shadow-lift">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                className={`flex h-12 items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-all ${
                  active ? "flex-[1.8] bg-ink px-4 text-white" : "flex-1 text-muted"
                }`}
              >
                <l.icon active={active} size={21} />
                {active && <span className="truncate">{l.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.05em]">
      <span className="aura h-6 w-6 rounded-full shadow-soft" />
      100bon
    </Link>
  );
}

type IconProps = { active: boolean; size?: number };
const stroke = (active: boolean) => ({ stroke: "currentColor", strokeWidth: active ? 2 : 1.6, fill: "none" });

function SunIcon({ active, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke(active)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}
function GridIcon({ active, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke(active)}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
function LayersIcon({ active, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke(active)} strokeLinejoin="round">
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 12.5L12 17l8.5-4.5" />
      <path d="M3.5 16.5L12 21l8.5-4.5" />
    </svg>
  );
}
function PlusIcon({ active, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke(active)} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
