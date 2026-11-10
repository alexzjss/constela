import type { Db } from '../db/db';
import { EMPTY_RATES, TERMS, type Rates } from '../engine/invest/types';
import { CURATED_ASSETS } from './assets';
import { getAllEntries, putEntries, type CacheEntry, type FetchFn } from './cache';
import { fetchBcb } from './sources/bcb';
import { fetchTesouro } from './sources/tesouro';
import { fetchYahoo } from './sources/yahoo';

export type SourceId = 'bcb' | 'tesouro' | 'yahoo';
export const TTL_HOURS: Record<SourceId, number> = { bcb: 6, tesouro: 24, yahoo: 6 };
const SOURCES: SourceId[] = ['bcb', 'tesouro', 'yahoo'];

export type RefreshStatus = 'ok' | 'cached' | 'erro';
export interface RefreshReport {
  sources: Record<SourceId, RefreshStatus>;
}

export interface Quote {
  value: number;
  asOf: string;
  fetchedAt: string;
  stale: boolean;
  extra?: Record<string, number | null>;
}
export type MarketSnapshot = Record<string, Quote>;

export function sourceOf(key: string): SourceId {
  if (key.startsWith('bcb.')) return 'bcb';
  if (key.startsWith('tesouro.')) return 'tesouro';
  return 'yahoo';
}

const ageHours = (fetchedAt: string, now: Date) => (now.getTime() - new Date(fetchedAt).getTime()) / 3_600_000;

/** Atualiza cada fonte cujo cache venceu. Uma fonte nunca derruba as outras. */
export async function refreshMarket(
  db: Db, fetchFn: FetchFn, now: Date, force = false,
): Promise<RefreshReport> {
  const cached = await getAllEntries(db);
  const adapters: Record<SourceId, () => Promise<CacheEntry[]>> = {
    bcb: () => fetchBcb(fetchFn, now),
    tesouro: () => fetchTesouro(fetchFn, now),
    yahoo: () => fetchYahoo(fetchFn, now, CURATED_ASSETS.map((a) => a.symbol)),
  };
  const sources = {} as Record<SourceId, RefreshStatus>;
  for (const id of SOURCES) {
    const mine = cached.filter((e) => sourceOf(e.key) === id);
    const newest = mine.reduce((m, e) => (e.fetchedAt > m ? e.fetchedAt : m), '');
    if (!force && newest && ageHours(newest, now) <= TTL_HOURS[id]) {
      sources[id] = 'cached';
      continue;
    }
    try {
      const entries = await adapters[id]();
      if (entries.length === 0) {
        sources[id] = 'erro';
      } else {
        await putEntries(db, entries);
        sources[id] = 'ok';
      }
    } catch {
      sources[id] = 'erro';
    }
  }
  return { sources };
}

export async function loadSnapshot(db: Db, now: Date): Promise<MarketSnapshot> {
  const snap: MarketSnapshot = {};
  for (const e of await getAllEntries(db)) {
    snap[e.key] = {
      value: e.value, asOf: e.asOf, fetchedAt: e.fetchedAt, extra: e.extra,
      stale: ageHours(e.fetchedAt, now) > TTL_HOURS[sourceOf(e.key)],
    };
  }
  return snap;
}

export function ratesFromSnapshot(snap: MarketSnapshot): Rates {
  const v = (k: string) => snap[k]?.value ?? null;
  const rates: Rates = {
    ...EMPTY_RATES,
    selic: v('bcb.selic'), cdi: v('bcb.cdi'), ipca12m: v('bcb.ipca12m'), tr: v('bcb.tr'),
    tesouroSelicSpread: v('tesouro.selicSpread'),
    tesouroPre: { ...EMPTY_RATES.tesouroPre },
    tesouroIpca: { ...EMPTY_RATES.tesouroIpca },
  };
  for (const t of TERMS) {
    rates.tesouroPre[t] = v(`tesouro.pre.${t}`);
    rates.tesouroIpca[t] = v(`tesouro.ipca.${t}`);
  }
  return rates;
}
