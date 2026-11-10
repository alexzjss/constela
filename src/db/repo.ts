import type { Db } from './db';
import { listHoldingMoves, listHoldings } from './holdings';
import type { Holding, HoldingMove } from '../domain/types';

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.all<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.run(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function deleteSetting(db: Db, key: string): Promise<void> {
  await db.run(`DELETE FROM meta WHERE key = ?`, [key]);
}

/** Ajustes que vão no backup. Chaves de IA ficam de fora de propósito: segredo não viaja em arquivo. */
const SETTING_KEYS = [
  'invest.profile', 'invest.term', 'invest.amount', 'invest.cdbPctCdi', 'invest.lciPctCdi', 'invest.custodyPct',
];

export interface Backup {
  version: 2;
  holdings: Holding[];
  moves: HoldingMove[];
  settings: Record<string, string>;
}

export async function exportAll(db: Db): Promise<Backup> {
  const settings: Record<string, string> = {};
  for (const k of SETTING_KEYS) {
    const v = await getSetting(db, k);
    if (v !== null) settings[k] = v;
  }
  return { version: 2, holdings: await listHoldings(db), moves: await listHoldingMoves(db), settings };
}

/** Restaura um backup sem duplicar (por id). Devolve quantas posições entraram. */
export async function importBackup(db: Db, data: Backup): Promise<{ added: number; skipped: number }> {
  if (!data || data.version !== 2 || !Array.isArray(data.holdings) || !Array.isArray(data.moves)) {
    throw new Error('Backup inválido.');
  }
  const have = new Set((await listHoldings(db)).map((h) => h.id));
  const haveMoves = new Set((await listHoldingMoves(db)).map((m) => m.id));
  let added = 0;
  await db.run('BEGIN');
  try {
    for (const h of data.holdings) {
      if (have.has(h.id)) continue;
      await db.run(
        `INSERT INTO holdings (id, type, name, invested, value, updatedAt, symbol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [h.id, h.type, h.name, h.invested, h.value, h.updatedAt, h.symbol ?? null],
      );
      added += 1;
    }
    for (const m of data.moves) {
      if (haveMoves.has(m.id)) continue;
      await db.run(
        `INSERT INTO holding_moves (id, holdingId, date, kind, amount) VALUES (?, ?, ?, ?, ?)`,
        [m.id, m.holdingId, m.date, m.kind, m.amount],
      );
    }
    for (const [k, v] of Object.entries(data.settings ?? {})) if (SETTING_KEYS.includes(k)) await setSetting(db, k, v);
    await db.run('COMMIT');
  } catch (e) {
    await db.run('ROLLBACK');
    throw e;
  }
  return { added, skipped: data.holdings.length - added };
}
