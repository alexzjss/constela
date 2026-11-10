import type { Draft, Source, Transaction } from '../domain/types';
import type { ImportedRow } from '../ingest/nubank';
import type { Db } from './db';

type Row = Omit<Transaction, 'needsReview'> & { needsReview: number };

const toTx = (r: Row): Transaction => ({ ...r, needsReview: r.needsReview === 1 });
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const INSERT = `INSERT INTO transactions
  (id, date, amount, kind, categoryId, description, source, externalId, needsReview, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const params = (t: Transaction) => [
  t.id, t.date, t.amount, t.kind, t.categoryId, t.description, t.source,
  t.externalId, t.needsReview ? 1 : 0, t.createdAt,
];

export async function insertTransaction(
  db: Db,
  d: Draft & { source: Source },
): Promise<Transaction> {
  const t: Transaction = {
    ...d, id: newId(), externalId: null, needsReview: false, createdAt: new Date().toISOString(),
  };
  await db.run(INSERT, params(t));
  return t;
}

export async function importRows(
  db: Db,
  rows: ImportedRow[],
): Promise<{ added: number; skipped: number }> {
  const known = new Set(
    (await db.all<{ externalId: string }>(
      `SELECT externalId FROM transactions WHERE externalId IS NOT NULL`,
    )).map((r) => r.externalId),
  );
  let added = 0;
  await db.run('BEGIN');
  try {
    for (const r of rows) {
      if (r.externalId && known.has(r.externalId)) continue;
      if (r.externalId) known.add(r.externalId);
      await db.run(INSERT, params({ ...r, id: newId(), createdAt: new Date().toISOString() }));
      added += 1;
    }
    await db.run('COMMIT');
  } catch (e) {
    await db.run('ROLLBACK');
    throw e;
  }
  return { added, skipped: rows.length - added };
}

export async function listTransactions(db: Db, from: string, to: string): Promise<Transaction[]> {
  const rows = await db.all<Row>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, createdAt DESC`,
    [from, to],
  );
  return rows.map(toTx);
}

export async function getUserRules(db: Db): Promise<Record<string, string>> {
  const rows = await db.all<{ key: string; categoryId: string }>(`SELECT key, categoryId FROM user_rules`);
  return Object.fromEntries(rows.map((r) => [r.key, r.categoryId]));
}

export async function setUserRule(db: Db, key: string, categoryId: string): Promise<void> {
  await db.run(
    `INSERT INTO user_rules (key, categoryId) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET categoryId = excluded.categoryId`,
    [key, categoryId],
  );
}

export async function exportAll(db: Db) {
  const rows = await db.all<Row>(`SELECT * FROM transactions ORDER BY date, createdAt`);
  return { version: 1 as const, transactions: rows.map(toTx), rules: await getUserRules(db) };
}
