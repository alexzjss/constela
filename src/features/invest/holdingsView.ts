import type { Holding, HoldingMove } from '../../domain/types';
import { summarizeHoldings, type HoldingsSummary } from '../../engine/holdings';
import { performance, rateIndex, seriesIndex, type Index, type Performance } from '../../engine/performance';
import type { Indexes } from '../../invest/history';
import { ratesFromSnapshot, type MarketSnapshot } from '../../invest/refresh';
import { formatBRL, type Cents } from '../../lib/money';

export interface HoldingRow {
  holding: Holding;
  perf: Performance;
  since: string | null; // data do primeiro aporte
  headline: string; // uma frase: está valendo a pena?
}

export interface HoldingsView {
  summary: HoldingsSummary;
  rows: HoldingRow[];
  total: Performance | null; // todas as posições somadas
}

/** Séries históricas quando existem; senão a taxa de hoje (CDI e IPCA 12m), marcada como estimativa. */
export function pickIndexes(idx: Indexes | null, snapshot: MarketSnapshot): { cdi: Index | null; ipca: Index | null } {
  const rates = ratesFromSnapshot(snapshot);
  return {
    cdi: idx?.cdi?.length ? seriesIndex(idx.cdi) : rates.cdi !== null ? rateIndex(rates.cdi) : null,
    ipca: idx?.ipca?.length ? seriesIndex(idx.ipca) : rates.ipca12m !== null ? rateIndex(rates.ipca12m) : null,
  };
}

const R = (c: Cents) => formatBRL(Math.abs(c));

export function headline(p: Performance): string {
  const note = p.estimated ? ' (estimativa pela taxa de hoje)' : '';
  switch (p.verdict) {
    case 'sem-dados': return 'Sem histórico de aportes ou de taxas para comparar.';
    case 'cedo': return 'Ainda cedo para comparar: menos de 30 dias.';
    case 'acima':
      return `Rendendo ${R(p.vsCdi ?? 0)} acima do CDI${p.beatsInflation === false ? ', mas abaixo da inflação' : ''}${note}.`;
    case 'abaixo':
      return `Rendendo ${R(p.vsCdi ?? 0)} abaixo do CDI${p.beatsInflation === false ? ' e abaixo da inflação' : ''}${note}.`;
  }
}

export function buildHoldingsView(
  holdings: Holding[], moves: HoldingMove[], idx: Indexes | null, snapshot: MarketSnapshot, today: string,
): HoldingsView {
  const { cdi, ipca } = pickIndexes(idx, snapshot);
  const rows = holdings.map((h): HoldingRow => {
    const perf = performance(h, moves, today, cdi, ipca);
    const own = moves.filter((m) => m.holdingId === h.id);
    const since = own.reduce<string | null>((m, x) => (m === null || x.date < m ? x.date : m), null);
    return { holding: h, perf, since, headline: headline(perf) };
  });
  const withMoves = rows.filter((r) => r.since !== null);
  let total: Performance | null = null;
  if (withMoves.length) {
    const sum = (f: (p: Performance) => number | null): number | null =>
      withMoves.every((r) => f(r.perf) !== null) ? withMoves.reduce((a, r) => a + (f(r.perf) as number), 0) : null;
    const contributed = withMoves.reduce((a, r) => a + r.perf.contributed, 0);
    const value = withMoves.reduce((a, r) => a + r.perf.value, 0);
    const aportes = withMoves.reduce((a, r) => a + (r.perf.gainPct === null ? 0 : r.perf.gain / r.perf.gainPct), 0);
    const cdiValue = sum((p) => p.cdiValue);
    const ipcaValue = sum((p) => p.ipcaValue);
    const days = Math.max(...withMoves.map((r) => r.perf.days));
    total = {
      contributed, value, gain: value - contributed, gainPct: aportes > 0 ? (value - contributed) / aportes : null,
      days, cdiValue, ipcaValue, vsCdi: cdiValue === null ? null : value - cdiValue,
      beatsInflation: ipcaValue === null ? null : value >= ipcaValue,
      verdict: days < 30 ? 'cedo' : cdiValue === null ? 'sem-dados' : value >= cdiValue ? 'acima' : 'abaixo',
      estimated: withMoves.some((r) => r.perf.estimated),
    };
  }
  return { summary: summarizeHoldings(holdings), rows, total };
}
