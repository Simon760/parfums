/* eslint-disable @next/next/no-img-element */
import type { OlfactothequeDB } from "@/lib/types";

interface Props {
  name: string;
  house?: string;
  family?: string;
  imageUrl?: string | null;
  families: OlfactothequeDB["families"];
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Photo du flacon, ou visuel généré à partir de la famille olfactive. */
export function BottleImage({ name, family, imageUrl, families, className = "", size = "md" }: Props) {
  const color = families.find((f) => f.id === family)?.color ?? "#b9ae9a";
  return (
    <div
      className={`relative overflow-hidden bg-paper-2 ${className}`}
      style={{ background: `radial-gradient(120% 90% at 50% 100%, ${color}40 0%, ${color}14 45%, var(--paper-2) 75%)` }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-[8%] mix-blend-multiply"
        />
      ) : (
        <GeneratedBottle name={name} color={color} size={size} />
      )}
    </div>
  );
}

function GeneratedBottle({ name, color, size }: { name: string; color: string; size: "sm" | "md" | "lg" }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 140" className="h-[46%] w-auto drop-shadow-[0_10px_18px_rgba(29,27,24,0.07)]" aria-hidden>
        <rect x="41" y="8" width="18" height="14" rx="2" fill="#2b2824" opacity="0.7" />
        <rect x="45" y="22" width="10" height="8" fill="#2b2824" opacity="0.28" />
        <rect x="14" y="30" width="72" height="104" rx="10" fill="#fbfaf7" stroke="#d4cec2" />
        <rect x="18" y="80" width="64" height="50" rx="7" fill={color} opacity="0.3" />
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontFamily="Instrument Serif, Georgia, serif"
          fontSize={size === "sm" ? 30 : 34}
          fill="#1d1b18"
        >
          {initial}
        </text>
      </svg>
    </div>
  );
}
