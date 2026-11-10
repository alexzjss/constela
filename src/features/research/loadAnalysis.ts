import type { Db } from '../../db/db';
import { listHoldings } from '../../db/holdings';
import { seriesIndex } from '../../engine/performance';
import { CURATED_ASSETS } from '../../invest/assets';
import type { FetchFn } from '../../invest/cache';
import { loadIndexes } from '../../invest/history';
import { BENCHMARKS, FX_SYMBOL, loadMany, type StoredSeries } from '../../invest/series';
import { addDays, todayLocal } from '../../lib/dates';
import { analyze, suggestDiversifiers, type Analysis, type AssetSeries, type HeldAsset, type Suggestion } from './analysis';
import { loadWatchlist } from './watchlist';

export interface Context {
  /** Quem entra na comparação: curados, acompanhados e o que o usuário tem. */
  universe: AssetSeries[];
  held: HeldAsset[];
  fx: AssetSeries['points'] | null;
  references: { symbol: string; label: string; currency: string; points: AssetSeries['points'] }[];
  cdi12m: number | null;
  /** Algum dado veio de cache vencido (sem rede). */
  stale: boolean;
  series: Record<string, StoredSeries>;
}

const asSeries = (s: StoredSeries): AssetSeries => ({ symbol: s.symbol, name: s.name, currency: s.currency, points: s.points });

/** Junta tudo que a análise precisa. Cada símbolo que falhar sai da comparação sem derrubar o resto. */
export async function loadContext(
  db: Db, fetchFn: FetchFn, now: Date, extra: string[] = [], force = false,
): Promise<Context> {
  const holdings = await listHoldings(db);
  const watch = await loadWatchlist(db);
  const heldSymbols = holdings.map((h) => h.symbol).filter((s): s is string => !!s);
  const symbols = [
    ...BENCHMARKS.map((b) => b.symbol),
    ...CURATED_ASSETS.map((a) => a.symbol),
    ...watch.map((w) => w.symbol),
    ...heldSymbols,
    ...extra,
  ];
  const series = await loadMany(db, fetchFn, now, symbols, force);

  const today = todayLocal(now);
  let cdi12m: number | null = null;
  try {
    const idx = await loadIndexes(db, fetchFn, now, addDays(today, -365), today);
    if (idx.cdi?.length) cdi12m = seriesIndex(idx.cdi).factor(addDays(today, -365), today) - 1;
  } catch {
    cdi12m = null;
  }

  const bench = new Set<string>(BENCHMARKS.map((b) => b.symbol));
  const held: HeldAsset[] = holdings.flatMap((h) =>
    h.symbol && series[h.symbol] ? [{ series: asSeries(series[h.symbol]), value: h.value }] : []);
  return {
    universe: Object.values(series).filter((s) => !bench.has(s.symbol)).map(asSeries),
    held,
    fx: series[FX_SYMBOL]?.points ?? null,
    references: BENCHMARKS.filter((b) => series[b.symbol]).map((b) => ({
      symbol: b.symbol, label: b.label, currency: series[b.symbol].currency, points: series[b.symbol].points,
    })),
    cdi12m,
    stale: Object.values(series).some((s) => s.stale),
    series,
  };
}

export function analysisFor(ctx: Context, symbol: string, addWeight = 0.1): Analysis | null {
  const s = ctx.series[symbol];
  if (!s) return null;
  return analyze({
    target: asSeries(s), fx: ctx.fx, references: ctx.references.filter((r) => r.symbol !== symbol),
    universe: ctx.universe, held: ctx.held, cdi12m: ctx.cdi12m, addWeight,
  });
}

export function diversifiersFor(ctx: Context, limit = 5, addWeight = 0.1): Suggestion[] {
  return suggestDiversifiers(ctx.held, ctx.universe, ctx.fx, { limit, addWeight });
}
