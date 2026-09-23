"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { OlfactothequeDB } from "@/lib/types";
import { meshGradient } from "@/lib/client/lookup";

interface Props {
  name: string;
  house?: string;
  family?: string;
  imageUrl?: string | null;
  families: OlfactothequeDB["families"];
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Photo du flacon sur un fond dégradé de sa famille, ou flacon stylisé si pas de photo. */
export function BottleImage({ name, family, imageUrl, families, className = "", size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Une erreur survenue avant l'hydratation ne déclenche pas onError : on vérifie au montage.
  useEffect(() => {
    const img = imgRef.current;
     
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [imageUrl]);
  const color = families.find((f) => f.id === family)?.color ?? "#9aa3b5";
  const showImage = imageUrl && !failed;
  const pad = size === "sm" ? "p-[10%]" : size === "lg" ? "p-[12%]" : "p-[11%]";

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: meshGradient(color) }}>
      {showImage ? (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain ${pad} mix-blend-multiply drop-shadow-[0_18px_22px_rgba(13,14,18,0.18)]`}
        />
      ) : (
        <GlassBottle color={color} small={size === "sm"} />
      )}
    </div>
  );
}

function GlassBottle({ color, small }: { color: string; small: boolean }) {
  const key = color.replace(/[^a-z0-9]/gi, "");
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 150" className={`${small ? "h-[62%]" : "h-[54%]"} w-auto drop-shadow-[0_20px_24px_rgba(13,14,18,0.18)]`} aria-hidden>
        <defs>
          <linearGradient id={`g-${key}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`j-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.55" />
            <stop offset="1" stopColor={color} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <rect x="38" y="4" width="24" height="22" rx="5" fill="#0d0e12" />
        <rect x="44" y="26" width="12" height="10" fill="#0d0e12" opacity="0.2" />
        <rect x="12" y="36" width="76" height="110" rx="20" fill={`url(#g-${key})`} stroke="#ffffff" strokeWidth="1.5" />
        <rect x="18" y="74" width="64" height="66" rx="15" fill={`url(#j-${key})`} />
        <rect x="20" y="42" width="8" height="40" rx="4" fill="#ffffff" opacity="0.8" />
      </svg>
    </div>
  );
}
