import type { MonthKey, Occasion, Region, TimeOfDay, LayeringStatus, PerceptionRisk, Season } from "./types";

export const MONTH_KEYS: MonthKey[] = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aout", "sep", "oct", "nov", "dec"];
export const MONTH_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export const REGION_LABELS: Record<Region, string> = { dubai: "Dubaï", france: "France" };

export const REGION_COORDS: Record<Region, { lat: number; lon: number; tz: string; city: string }> = {
  dubai: { lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai", city: "Dubaï" },
  france: { lat: 49.4432, lon: 1.0999, tz: "Europe/Paris", city: "Rouen" },
};

export const TIME_LABELS: Record<TimeOfDay, string> = { day: "Jour", evening: "Soir" };

export const OCCASION_LABELS: Record<Occasion, string> = {
  daily: "Quotidien",
  bureau: "Bureau",
  date: "Date",
  diner: "Dîner",
  soiree: "Soirée",
  evenement: "Événement",
  mariage: "Mariage",
  sport: "Sport",
  plage: "Plage",
  voyage: "Voyage",
  cocooning: "Cocooning",
  majlis: "Majlis",
};
export const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

export const SEASON_LABELS: Record<Season, string> = {
  hiver: "Hiver",
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
};

export const SILLAGE_LABELS: Record<number, string> = {
  1: "Faible",
  2: "Modéré",
  3: "Explosif",
  4: "Bombe nucléaire",
};

export const SCORE_LABELS: Record<number, string> = {
  0: "À éviter",
  1: "Sous conditions",
  2: "Bon",
  3: "Idéal",
};

export const LAYERING_STATUSES: LayeringStatus[] = ["validé", "recommandé", "à tester", "déconseillé"];

export const RISK_LABELS: Record<PerceptionRisk, string> = {
  élevé: "Perception : risque élevé",
  moyen: "Perception : intermittente",
  faible: "Perception : stable",
};

export const OWNED_FORMATS = ["original", "dupe", "original + dupe", "inconnu"] as const;

export const ROLE_LABELS = { fond: "Fond", milieu: "Milieu", dessus: "Dessus" } as const;
