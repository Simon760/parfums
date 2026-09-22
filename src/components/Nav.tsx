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
      <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <Link href="/" className="display text-[28px]">
            100<span className="italic text-accent">bon</span>
          </Link>
          <nav className="flex gap-8 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative py-1 transition-colors ${isActive(l.href) ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {l.label}
                {isActive(l.href) && <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] tracking-wide ${
                isActive(l.href) ? "text-ink" : "text-muted"
              }`}
            >
              <l.icon active={isActive(l.href)} />
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

type IconProps = { active: boolean };
const stroke = (active: boolean) => ({ stroke: "currentColor", strokeWidth: active ? 1.7 : 1.3, fill: "none" });

function SunIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke(active)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}
function GridIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke(active)}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
function LayersIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke(active)} strokeLinejoin="round">
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 12.5L12 17l8.5-4.5" />
      <path d="M3.5 16.5L12 21l8.5-4.5" />
    </svg>
  );
}
function PlusIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke(active)} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
