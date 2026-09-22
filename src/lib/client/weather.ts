"use client";

import { useEffect, useState } from "react";
import type { Region } from "../types";
import { REGION_COORDS } from "../labels";

export interface Weather {
  temp: number | null;
  tempMax: number | null;
  tempMin: number | null;
  condition: string | null;
}

// Codes météo WMO (Open-Meteo) → libellé court.
const WMO: [number[], string][] = [
  [[0], "ciel dégagé"],
  [[1, 2], "éclaircies"],
  [[3], "couvert"],
  [[45, 48], "brouillard"],
  [[51, 53, 55, 56, 57], "bruine"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "pluie"],
  [[71, 73, 75, 77, 85, 86], "neige"],
  [[95, 96, 99], "orage"],
];

export function useWeather(region: Region) {
  const [state, setState] = useState<{ region: Region; weather: Weather | null; error: boolean } | null>(null);

  useEffect(() => {
    const { lat, lon, tz } = REGION_COORDS[region];
    const ctrl = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=${encodeURIComponent(tz)}`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const code = d.current?.weather_code as number | undefined;
        setState({
          region,
          error: false,
          weather: {
            temp: d.current?.temperature_2m ?? null,
            tempMax: d.daily?.temperature_2m_max?.[0] ?? null,
            tempMin: d.daily?.temperature_2m_min?.[0] ?? null,
            condition: code == null ? null : (WMO.find(([codes]) => codes.includes(code))?.[1] ?? null),
          },
        });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ region, weather: null, error: true });
        void e;
      });
    return () => ctrl.abort();
  }, [region]);

  const current = state?.region === region ? state : null;
  return { weather: current?.weather ?? null, loading: !current, error: current?.error ?? false };
}
