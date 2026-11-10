import type { PricePoint } from '../../engine/correlation';
import type { FetchFn } from '../cache';

export interface RawSeries {
  symbol: string;
  name: string;
  currency: string;
  points: PricePoint[];
}

interface ChartResult {
  meta?: { currency?: unknown; longName?: unknown; shortName?: unknown; symbol?: unknown };
  timestamp?: unknown;
  indicators?: { quote?: { close?: (number | null)[] }[]; adjclose?: { adjclose?: (number | null)[] }[] };
}

const isoDay = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString().slice(0, 10);

/**
 * Histórico diário (até 5 anos) ajustado por proventos quando o Yahoo informa — sem o ajuste, um papel que
 * paga muito dividendo parece cair no dia do pagamento e distorce a correlação. null se a fonte falhar.
 */
export async function fetchHistory(fetchFn: FetchFn, symbol: string, range = '5y'): Promise<RawSeries | null> {
  try {
    const res = await fetchFn(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&events=div%2Csplit`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) return null;
    const r = ((await res.json()) as { chart?: { result?: ChartResult[] } }).chart?.result?.[0];
    const ts = r?.timestamp;
    if (!Array.isArray(ts)) return null;
    const adj = r?.indicators?.adjclose?.[0]?.adjclose;
    const raw = r?.indicators?.quote?.[0]?.close;
    const closes = Array.isArray(adj) ? adj : raw;
    if (!Array.isArray(closes)) return null;
    const points: PricePoint[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (typeof ts[i] === 'number' && typeof c === 'number' && Number.isFinite(c) && c > 0) points.push([isoDay(ts[i]), c]);
    }
    if (points.length < 2) return null;
    const m = r?.meta;
    return {
      symbol,
      name: typeof m?.longName === 'string' ? m.longName : typeof m?.shortName === 'string' ? m.shortName : symbol,
      currency: typeof m?.currency === 'string' ? m.currency : 'USD',
      points,
    };
  } catch {
    return null;
  }
}
