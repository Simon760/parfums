"use client";

import { useEffect, useState } from "react";

/** Petite préférence persistée dans le navigateur (région, filtres…). */
export function usePref<T extends string>(key: string, initial: T, allowed?: readonly T[]) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`100bon:${key}`) as T | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique après hydratation
      if (stored && (!allowed || allowed.includes(stored))) setValue(stored);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(`100bon:${key}`, v);
    } catch {}
  };
  return [value, update] as const;
}

export async function postJSON<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data as T;
}
