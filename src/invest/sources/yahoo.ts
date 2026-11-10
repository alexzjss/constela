import type { CacheEntry, FetchFn } from '../cache';

interface ChartResult {
  meta?: { regularMarketPrice?: unknown; regularMarketTime?: unknown };
  indicators?: { quote?: { close?: (number | null)[] }[] };
  events?: { dividends?: Record<string, { amount?: number }> };
}

const chartUrl = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1mo&events=div`;

const isoDay = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString().slice(0, 10);

async function one(fetchFn: FetchFn, symbol: string, key: string, fetchedAt: string): Promise<CacheEntry | null> {
  try {
    const res = await fetchFn(chartUrl(symbol), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const r = ((await res.json()) as { chart?: { result?: ChartResult[] } }).chart?.result?.[0];
    const price = r?.meta?.regularMarketPrice;
    const time = r?.meta?.regularMarketTime;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
    const asOf = typeof time === 'number' ? isoDay(time) : fetchedAt.slice(0, 10);

    const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => typeof c === 'number' && c > 0);
    const change12m = closes.length >= 2 ? closes[closes.length - 1] / closes[0] - 1 : null;
    const divs = Object.values(r?.events?.dividends ?? {})
      .map((d) => d.amount)
      .filter((a): a is number => typeof a === 'number' && a > 0);
    const dividendYield = divs.length > 0 ? divs.reduce((a, b) => a + b, 0) / price : null;
    return { key, value: price, asOf, fetchedAt, extra: { change12m, dividendYield } };
  } catch {
    return null;
  }
}

/** Cotações dos símbolos (moeda nativa) mais o câmbio USD/BRL. Cada símbolo falha sozinho. */
export async function fetchYahoo(fetchFn: FetchFn, now: Date, symbols: string[]): Promise<CacheEntry[]> {
  const fetchedAt = now.toISOString();
  const results = await Promise.all([
    ...symbols.map((s) => one(fetchFn, s, `asset:${s}`, fetchedAt)),
    one(fetchFn, 'USDBRL=X', 'fx.usdbrl', fetchedAt),
  ]);
  return results.filter((e): e is CacheEntry => e !== null);
}
