import type { Db } from '../db/db';
import { getSetting, setSetting } from '../db/repo';
import type { Rates } from '../engine/invest/types';
import type { FetchFn } from './cache';
import { fetchSeries, type SeriesPoint } from './sources/history';

const CDI_DAILY = 12; // CDI, variação diária em %
const IPCA_MONTHLY = 433; // IPCA, variação mensal em %
const TTL_HOURS = 24;

interface Stored {
  from: string;
  fetchedAt: string;
  points: SeriesPoint[];
}

export interface Indexes {
  cdi: SeriesPoint[] | null;
  ipca: SeriesPoint[] | null;
}

async function load(
  db: Db, fetchFn: FetchFn, now: Date, key: string, code: number, from: string, today: string,
): Promise<SeriesPoint[] | null> {
  let cached: Stored | null = null;
  try {
    cached = JSON.parse((await getSetting(db, key)) ?? 'null') as Stored | null;
  } catch {
    cached = null;
  }
  const fresh = cached && cached.from <= from && (now.getTime() - new Date(cached.fetchedAt).getTime()) / 3_600_000 < TTL_HOURS;
  if (fresh && cached) return cached.points;
  const points = await fetchSeries(fetchFn, code, from, today);
  if (points && points.length > 0) {
    await setSetting(db, key, JSON.stringify({ from, fetchedAt: now.toISOString(), points } satisfies Stored));
    return points;
  }
  return cached && cached.from <= from ? cached.points : null; // sem rede: usa o que tem, mesmo velho
}

/** CDI diário e IPCA mensal desde `from`, com cache de 24 h. Cada série falha sozinha. */
export async function loadIndexes(db: Db, fetchFn: FetchFn, now: Date, from: string, today: string): Promise<Indexes> {
  return {
    cdi: await load(db, fetchFn, now, 'idx.cdi', CDI_DAILY, from, today),
    ipca: await load(db, fetchFn, now, 'idx.ipca', IPCA_MONTHLY, from, today),
  };
}

export const ratesForEstimate = (r: Rates) => ({ cdi: r.cdi, ipca: r.ipca12m });
