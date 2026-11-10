import type { Term } from './types';

/** IR regressivo sobre o ganho da renda fixa. */
export function irRate(days: number): number {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

// Dia 1..30, em %.
const IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

export function iofRate(days: number): number {
  if (days >= 30) return 0;
  return IOF[Math.max(1, Math.floor(days)) - 1] / 100;
}

export function termDays(term: Term): number {
  return Math.round((term * 365) / 12);
}
