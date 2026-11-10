import type { Db } from '../../db/db';
import { getSetting, setSetting } from '../../db/repo';
import type { AssetClass } from '../../engine/invest/types';

export interface WatchItem {
  symbol: string;
  name: string;
  cls: Exclude<AssetClass, 'rendaFixa'>;
}

const KEY = 'watchlist';

export async function loadWatchlist(db: Db): Promise<WatchItem[]> {
  try {
    const raw = JSON.parse((await getSetting(db, KEY)) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is WatchItem => typeof x?.symbol === 'string' && typeof x?.name === 'string') : [];
  } catch {
    return [];
  }
}

export async function addToWatchlist(db: Db, item: WatchItem): Promise<WatchItem[]> {
  const list = await loadWatchlist(db);
  if (list.some((x) => x.symbol === item.symbol)) return list;
  const next = [...list, item];
  await setSetting(db, KEY, JSON.stringify(next));
  return next;
}

export async function removeFromWatchlist(db: Db, symbol: string): Promise<WatchItem[]> {
  const next = (await loadWatchlist(db)).filter((x) => x.symbol !== symbol);
  await setSetting(db, KEY, JSON.stringify(next));
  return next;
}
