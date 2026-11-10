import type { Db } from '../db/db';

export type FetchFn = typeof fetch;

export interface CacheEntry {
  key: string;
  value: number;
  asOf: string; // data do dado, YYYY-MM-DD
  fetchedAt: string; // ISO de quando buscamos
  extra?: Record<string, number | null>;
}

export async function putEntries(db: Db, entries: CacheEntry[]): Promise<void> {
  for (const e of entries) {
    await db.run(
      `INSERT INTO reference_rate (key, value, asOf, fetchedAt, extra) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, asOf = excluded.asOf,
         fetchedAt = excluded.fetchedAt, extra = excluded.extra`,
      [e.key, e.value, e.asOf, e.fetchedAt, e.extra ? JSON.stringify(e.extra) : null],
    );
  }
}

export async function getAllEntries(db: Db): Promise<CacheEntry[]> {
  const rows = await db.all<Omit<CacheEntry, 'extra'> & { extra: string | null }>(
    `SELECT key, value, asOf, fetchedAt, extra FROM reference_rate`,
  );
  return rows.map((r) => ({ ...r, extra: r.extra ? JSON.parse(r.extra) : undefined }));
}
