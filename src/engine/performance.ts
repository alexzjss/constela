import type { Holding, HoldingMove } from '../domain/types';
import { daysBetween } from '../lib/dates';
import type { Cents } from '../lib/money';

export type SeriesPoint = [string, number];

/** Quanto R$ 1 vira entre duas datas. `estimated` = veio da taxa de hoje, não de série histórica. */
export interface Index {
  factor(from: string, to: string): number;
  estimated: boolean;
}

/** Série de variações em % (diária ou mensal): produto das variações com data em (from, to]. */
export function seriesIndex(points: SeriesPoint[]): Index {
  return {
    estimated: false,
    factor: (from, to) => {
      let f = 1;
      for (const [d, pct] of points) if (d > from && d <= to) f *= 1 + pct / 100;
      return f;
    },
  };
}

/** Sem série: aplica a taxa anual de hoje pelos dias corridos. */
export function rateIndex(annual: number): Index {
  return { estimated: true, factor: (from, to) => (1 + annual) ** (Math.max(0, daysBetween(from, to)) / 365) };
}

export type Verdict = 'acima' | 'abaixo' | 'cedo' | 'sem-dados';

export interface Performance {
  contributed: Cents; // aportes − resgates
  value: Cents;
  gain: Cents; // value − contributed
  gainPct: number | null; // gain / aportes
  days: number;
  cdiValue: Cents | null; // quanto teria o mesmo fluxo no CDI
  ipcaValue: Cents | null; // e só corrigido pela inflação
  vsCdi: Cents | null; // value − cdiValue
  beatsInflation: boolean | null;
  verdict: Verdict;
  estimated: boolean;
}

export const MIN_DAYS = 30;

/** Rendimento de uma posição contra o CDI e a inflação, com o mesmo fluxo de aportes e resgates. */
export function performance(
  h: Holding, moves: HoldingMove[], today: string, cdi: Index | null, ipca: Index | null,
): Performance {
  const own = moves.filter((m) => m.holdingId === h.id);
  const aportes = own.filter((m) => m.kind === 'aporte').reduce((a, m) => a + m.amount, 0);
  const resgates = own.filter((m) => m.kind === 'resgate').reduce((a, m) => a + m.amount, 0);
  const contributed = aportes - resgates;
  const first = own.reduce<string | null>((m, x) => (m === null || x.date < m ? x.date : m), null);
  const days = first ? Math.max(0, daysBetween(first, today)) : 0;
  const grow = (idx: Index | null): Cents | null =>
    idx ? Math.round(own.reduce((a, m) => a + (m.kind === 'aporte' ? 1 : -1) * m.amount * idx.factor(m.date, today), 0)) : null;
  const cdiValue = grow(cdi);
  const ipcaValue = grow(ipca);
  const vsCdi = cdiValue === null ? null : h.value - cdiValue;
  let verdict: Verdict = 'sem-dados';
  if (own.length === 0) verdict = 'sem-dados';
  else if (days < MIN_DAYS) verdict = 'cedo';
  else if (vsCdi !== null) verdict = vsCdi >= 0 ? 'acima' : 'abaixo';
  return {
    contributed, value: h.value, gain: h.value - contributed,
    gainPct: aportes > 0 ? (h.value - contributed) / aportes : null,
    days, cdiValue, ipcaValue, vsCdi,
    beatsInflation: ipcaValue === null ? null : h.value >= ipcaValue,
    verdict, estimated: !!(cdi?.estimated || ipca?.estimated),
  };
}
