import type { Db } from '../db/db';
import type { PricePoint } from '../engine/correlation';
import type { FetchFn } from './cache';
import { fetchHistory, type RawSeries } from './sources/yahooHistory';

export const SERIES_TTL_HOURS = 24;

/** Índices e câmbio usados como referência nas correlações com indicadores. */
export const BENCHMARKS = [
  { symbol: '^BVSP', label: 'Ibovespa' },
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: 'USDBRL=X', label: 'Dólar' },
] as const;
export const FX_SYMBOL = 'USDBRL=X';

export interface StoredSeries extends RawSeries {
  fetchedAt: string;
  stale: boolean;
}

const ageHours = (fetchedAt: string, now: Date) => (now.getTime() - new Date(fetchedAt).getTime()) / 3_600_000;

async function read(db: Db, symbol: string, now: Date): Promise<StoredSeries | null> {
  const rows = await db.all<{ symbol: string; currency: string; name: string; fetchedAt: string; points: string }>(
    `SELECT * FROM price_series WHERE symbol = ?`, [symbol],
  );
  const r = rows[0];
  if (!r) return null;
  try {
    return { symbol: r.symbol, currency: r.currency, name: r.name, fetchedAt: r.fetchedAt,
      points: JSON.parse(r.points) as PricePoint[], stale: ageHours(r.fetchedAt, now) > SERIES_TTL_HOURS };
  } catch {
    return null;
  }
}

async function write(db: Db, s: RawSeries, now: Date): Promise<void> {
  await db.run(
    `INSERT INTO price_series (symbol, currency, name, fetchedAt, points) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET currency = excluded.currency, name = excluded.name,
       fetchedAt = excluded.fetchedAt, points = excluded.points`,
    [s.symbol, s.currency, s.name, now.toISOString(), JSON.stringify(s.points)],
  );
}

/** Série do símbolo: cache fresco, senão rede, senão o cache velho (marcado stale), senão null. */
export async function loadSeries(
  db: Db, fetchFn: FetchFn, now: Date, symbol: string, force = false,
): Promise<StoredSeries | null> {
  const cached = await read(db, symbol, now);
  if (cached && !cached.stale && !force) return cached;
  const fresh = await fetchHistory(fetchFn, symbol);
  if (fresh) {
    await write(db, fresh, now);
    return { ...fresh, fetchedAt: now.toISOString(), stale: false };
  }
  return cached ? { ...cached, stale: true } : null;
}

/** Vários símbolos de uma vez; os que falham ficam de fora. Poucos em paralelo para não irritar a fonte. */
export async function loadMany(
  db: Db, fetchFn: FetchFn, now: Date, symbols: string[], force = false,
): Promise<Record<string, StoredSeries>> {
  const out: Record<string, StoredSeries> = {};
  const todo = [...new Set(symbols)];
  const LANES = 4;
  await Promise.all(Array.from({ length: LANES }, async () => {
    for (let s = todo.shift(); s !== undefined; s = todo.shift()) {
      const r = await loadSeries(db, fetchFn, now, s, force);
      if (r) out[s] = r;
    }
  }));
  return out;
}
