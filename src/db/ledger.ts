import type { Holding, IncomeSource, MonthSnapshot } from '../domain/types';
import type { Db } from './db';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

type SourceRow = Omit<IncomeSource, 'active'> & { active: number };
const toSource = (r: SourceRow): IncomeSource => ({ ...r, active: r.active === 1 });

const SOURCE_COLS = `(id, name, type, amount, day, startMonth, endMonth, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const sourceParams = (s: IncomeSource) =>
  [s.id, s.name, s.type, s.amount, s.day, s.startMonth, s.endMonth, s.active ? 1 : 0];

export async function addIncomeSource(db: Db, s: Omit<IncomeSource, 'id'>): Promise<IncomeSource> {
  const source: IncomeSource = { ...s, id: newId() };
  await db.run(`INSERT INTO income_sources ${SOURCE_COLS}`, sourceParams(source));
  return source;
}

export async function listIncomeSources(db: Db): Promise<IncomeSource[]> {
  const rows = await db.all<SourceRow>(`SELECT * FROM income_sources ORDER BY active DESC, day, name`);
  return rows.map(toSource);
}

export async function updateIncomeSource(db: Db, s: IncomeSource): Promise<void> {
  await db.run(
    `UPDATE income_sources SET name = ?, type = ?, amount = ?, day = ?, startMonth = ?, endMonth = ?, active = ? WHERE id = ?`,
    [s.name, s.type, s.amount, s.day, s.startMonth, s.endMonth, s.active ? 1 : 0, s.id],
  );
}

export async function deleteIncomeSource(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM income_sources WHERE id = ?`, [id]);
  await db.run(`DELETE FROM income_runs WHERE sourceId = ?`, [id]);
}

export async function listIncomeRuns(db: Db): Promise<{ sourceId: string; month: string }[]> {
  return db.all(`SELECT sourceId, month FROM income_runs`);
}

export async function markIncomeRun(db: Db, sourceId: string, month: string): Promise<void> {
  await db.run(`INSERT OR IGNORE INTO income_runs (sourceId, month) VALUES (?, ?)`, [sourceId, month]);
}

export async function addHolding(db: Db, h: Omit<Holding, 'id'>): Promise<Holding> {
  const holding: Holding = { ...h, id: newId() };
  await db.run(
    `INSERT INTO holdings (id, type, name, invested, value, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [holding.id, holding.type, holding.name, holding.invested, holding.value, holding.updatedAt],
  );
  return holding;
}

export async function listHoldings(db: Db): Promise<Holding[]> {
  return db.all<Holding>(`SELECT * FROM holdings ORDER BY type, name`);
}

export async function updateHolding(db: Db, h: Holding): Promise<void> {
  await db.run(
    `UPDATE holdings SET type = ?, name = ?, invested = ?, value = ?, updatedAt = ? WHERE id = ?`,
    [h.type, h.name, h.invested, h.value, h.updatedAt, h.id],
  );
}

export async function deleteHolding(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM holdings WHERE id = ?`, [id]);
}

export async function getMonthSnapshot(db: Db, month: string): Promise<MonthSnapshot> {
  const rows = await db.all<MonthSnapshot>(`SELECT * FROM month_snapshots WHERE month = ?`, [month]);
  return rows[0] ?? { month, accountBalance: null, invested: null };
}

export async function listMonthSnapshots(db: Db): Promise<MonthSnapshot[]> {
  return db.all<MonthSnapshot>(`SELECT * FROM month_snapshots ORDER BY month DESC`);
}

export async function saveMonthSnapshot(db: Db, s: MonthSnapshot): Promise<void> {
  await db.run(
    `INSERT INTO month_snapshots (month, accountBalance, invested) VALUES (?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET accountBalance = excluded.accountBalance, invested = excluded.invested`,
    [s.month, s.accountBalance, s.invested],
  );
}

/** Parte do backup que vive nas tabelas deste módulo. */
export interface LedgerBackup {
  incomeSources?: IncomeSource[];
  incomeRuns?: { sourceId: string; month: string }[];
  holdings?: Holding[];
  snapshots?: MonthSnapshot[];
}

export async function exportLedger(db: Db): Promise<Required<LedgerBackup>> {
  return {
    incomeSources: await listIncomeSources(db),
    incomeRuns: await listIncomeRuns(db),
    holdings: await listHoldings(db),
    snapshots: await listMonthSnapshots(db),
  };
}

/** Restaura sem duplicar (por id; snapshots por mês). Roda dentro da transação do chamador. */
export async function importLedger(db: Db, data: LedgerBackup): Promise<void> {
  const haveSources = new Set((await listIncomeSources(db)).map((s) => s.id));
  for (const s of data.incomeSources ?? []) {
    if (haveSources.has(s.id)) continue;
    await db.run(`INSERT INTO income_sources ${SOURCE_COLS}`, sourceParams(s));
  }
  for (const r of data.incomeRuns ?? []) await markIncomeRun(db, r.sourceId, r.month);
  const haveHoldings = new Set((await listHoldings(db)).map((h) => h.id));
  for (const h of data.holdings ?? []) {
    if (haveHoldings.has(h.id)) continue;
    await db.run(
      `INSERT INTO holdings (id, type, name, invested, value, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [h.id, h.type, h.name, h.invested, h.value, h.updatedAt],
    );
  }
  const haveMonths = new Set((await listMonthSnapshots(db)).map((s) => s.month));
  for (const s of data.snapshots ?? []) if (!haveMonths.has(s.month)) await saveMonthSnapshot(db, s);
}
