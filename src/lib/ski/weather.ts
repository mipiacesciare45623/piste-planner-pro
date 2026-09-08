import type { Resort } from "./types";
import { parseDate } from "./traffic";

/**
 * Stima meteo/neve deterministica: nessun servizio esterno, solo il periodo
 * scelto, la quota della località e la copertura di innevamento programmato.
 * Serve a confrontare le località fra loro, non è una previsione puntuale.
 */
export interface WeatherEstimate {
  /** 0 = condizioni pessime, 1 = condizioni ideali. */
  score: number;
  label: string;
  detail: string;
}

const MONTH_SCORE: Record<number, number> = {
  0: 0.95, // gennaio
  1: 0.95, // febbraio
  2: 0.85, // marzo
  3: 0.6, // aprile
  4: 0.3,
  5: 0.1,
  6: 0.05,
  7: 0.05,
  8: 0.1,
  9: 0.3,
  10: 0.6, // novembre
  11: 0.9, // dicembre
};

export function estimateWeather(resort: Resort, startDate: string): WeatherEstimate {
  const month = parseDate(startDate).getMonth();
  const season = MONTH_SCORE[month] ?? 0.5;

  // Quota: sopra i 2000 m la neve regge molto meglio a inizio/fine stagione.
  const altitudeBonus = Math.min(0.25, Math.max(-0.1, (resort.altitude - 1600) / 4000));
  const snowmaking = (resort.snowmaking_coverage / 100) * 0.2;

  const score = Math.min(1, Math.max(0, season * 0.7 + altitudeBonus + snowmaking));

  let label = "Condizioni incerte";
  let detail = "neve variabile: valuta le webcam prima di partire";
  if (score >= 0.8) {
    label = "Condizioni ottime";
    detail = "periodo pieno di stagione, quota alta e innevamento affidabile";
  } else if (score >= 0.6) {
    label = "Condizioni buone";
    detail = "neve generalmente sicura, possibili tratti battuti dal sole";
  } else if (score < 0.4) {
    label = "Condizioni a rischio";
    detail = "periodo o quota critici: la neve potrebbe mancare";
  }

  return { score: Math.round(score * 100) / 100, label, detail };
}

/**
 * Penalità meteo: si attiva solo se l'utente dà importanza 4 o 5 al bel tempo.
 * Vale al massimo circa 2 ore-equivalenti al giorno con importanza 5.
 */
export function weatherPenalty(
  estimate: WeatherEstimate,
  weatherWeight: number,
  days: number,
): number {
  if (weatherWeight < 4) return 0;
  const intensity = weatherWeight === 5 ? 2 : 1.2;
  return Math.round((1 - estimate.score) * intensity * days * 10) / 10;
}
