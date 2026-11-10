import type { Bill, Draft, Goal, Source, Transaction } from '../domain/types';
import type { ImportedRow } from '../ingest/nubank';
import type { Db } from './db';
import { exportLedger, importLedger, type LedgerBackup } from './ledger';

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
  d: Draft & { source: Source; externalId?: string },
): Promise<Transaction> {
  const t: Transaction = {
    ...d, id: newId(), externalId: d.externalId ?? null, needsReview: false, createdAt: new Date().toISOString(),
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

export async function getTransaction(db: Db, id: string): Promise<Transaction | null> {
  const rows = await db.all<Row>(`SELECT * FROM transactions WHERE id = ?`, [id]);
  return rows[0] ? toTx(rows[0]) : null;
}

/** Edita um lançamento já salvo. Se o usuário mexe, deixa de precisar de revisão. */
export async function updateTransaction(db: Db, id: string, d: Draft): Promise<void> {
  await db.run(
    `UPDATE transactions SET date = ?, amount = ?, kind = ?, categoryId = ?, description = ?, needsReview = 0 WHERE id = ?`,
    [d.date, d.amount, d.kind, d.categoryId, d.description, id],
  );
}

export async function deleteTransaction(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM transactions WHERE id = ?`, [id]);
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

export async function addBill(db: Db, b: Omit<Bill, 'id'>): Promise<Bill> {
  const bill: Bill = { ...b, id: newId() };
  await db.run(
    `INSERT INTO bills (id, name, amount, dueDay, categoryId) VALUES (?, ?, ?, ?, ?)`,
    [bill.id, bill.name, bill.amount, bill.dueDay, bill.categoryId],
  );
  return bill;
}

export async function listBills(db: Db): Promise<Bill[]> {
  return db.all<Bill>(`SELECT * FROM bills ORDER BY dueDay, name`);
}

export async function deleteBill(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM bills WHERE id = ?`, [id]);
}

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

export async function addGoal(db: Db, g: Omit<Goal, 'id' | 'saved'>): Promise<Goal> {
  const goal: Goal = { ...g, id: newId(), saved: 0 };
  await db.run(
    `INSERT INTO goals (id, name, target, startDate, deadline, saved) VALUES (?, ?, ?, ?, ?, ?)`,
    [goal.id, goal.name, goal.target, goal.startDate, goal.deadline, goal.saved],
  );
  return goal;
}

export async function listGoals(db: Db): Promise<Goal[]> {
  return db.all<Goal>(`SELECT * FROM goals ORDER BY deadline, name`);
}

export async function addToGoal(db: Db, id: string, cents: number): Promise<void> {
  await db.run(`UPDATE goals SET saved = saved + ? WHERE id = ?`, [cents, id]);
}

export async function deleteGoal(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM goals WHERE id = ?`, [id]);
}

const SETTING_KEYS = ['monthlyIncome', 'reserveBalance', 'accountBalance'];

export interface Backup extends LedgerBackup {
  version: 1;
  transactions: Transaction[];
  rules: Record<string, string>;
  bills?: Bill[];
  goals?: Goal[];
  settings?: Record<string, string>;
}

export async function exportAll(db: Db): Promise<Backup> {
  const rows = await db.all<Row>(`SELECT * FROM transactions ORDER BY date, createdAt`);
  const settings: Record<string, string> = {};
  for (const k of SETTING_KEYS) {
    const v = await getSetting(db, k);
    if (v !== null) settings[k] = v;
  }
  return {
    version: 1, transactions: rows.map(toTx), rules: await getUserRules(db),
    bills: await listBills(db), goals: await listGoals(db), settings,
    ...(await exportLedger(db)),
  };
}

/** Restaura um backup JSON sem duplicar (por id e por externalId). Conta só lançamentos. */
export async function importBackup(db: Db, data: Backup): Promise<{ added: number; skipped: number }> {
  if (!data || data.version !== 1 || !Array.isArray(data.transactions)) throw new Error('Backup inválido.');
  const known = await db.all<{ id: string; externalId: string | null }>(`SELECT id, externalId FROM transactions`);
  const ids = new Set(known.map((k) => k.id));
  const exts = new Set(known.map((k) => k.externalId).filter((x): x is string => !!x));
  let added = 0;
  await db.run('BEGIN');
  try {
    for (const t of data.transactions) {
      if (ids.has(t.id) || (t.externalId && exts.has(t.externalId))) continue;
      ids.add(t.id);
      if (t.externalId) exts.add(t.externalId);
      await db.run(INSERT, params(t));
      added += 1;
    }
    const haveBills = new Set((await listBills(db)).map((b) => b.id));
    for (const b of data.bills ?? []) {
      if (haveBills.has(b.id)) continue;
      await db.run(`INSERT INTO bills (id, name, amount, dueDay, categoryId) VALUES (?, ?, ?, ?, ?)`, [b.id, b.name, b.amount, b.dueDay, b.categoryId]);
    }
    const haveGoals = new Set((await listGoals(db)).map((g) => g.id));
    for (const g of data.goals ?? []) {
      if (haveGoals.has(g.id)) continue;
      await db.run(
        `INSERT INTO goals (id, name, target, startDate, deadline, saved) VALUES (?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.target, g.startDate, g.deadline, g.saved],
      );
    }
    await importLedger(db, data);
    for (const [k, v] of Object.entries(data.settings ?? {})) if (SETTING_KEYS.includes(k)) await setSetting(db, k, v);
    for (const [k, v] of Object.entries(data.rules ?? {})) await setUserRule(db, k, v);
    await db.run('COMMIT');
  } catch (e) {
    await db.run('ROLLBACK');
    throw e;
  }
  return { added, skipped: data.transactions.length - added };
}
