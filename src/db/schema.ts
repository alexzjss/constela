import type { Db } from './db';

export const SCHEMA_VERSION = 6;

export async function migrate(db: Db): Promise<void> {
  await db.run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await db.run(`CREATE TABLE IF NOT EXISTS reference_rate (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL,
    asOf TEXT NOT NULL,
    fetchedAt TEXT NOT NULL,
    extra TEXT
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    invested INTEGER NOT NULL,
    value INTEGER NOT NULL,
    updatedAt TEXT NOT NULL
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS holding_moves (
    id TEXT PRIMARY KEY,
    holdingId TEXT NOT NULL,
    date TEXT NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_moves_holding ON holding_moves(holdingId)`);
  // Posições de antes dos movimentos ganham um aporte inicial (id estável: roda uma vez só).
  await db.run(`INSERT OR IGNORE INTO holding_moves (id, holdingId, date, kind, amount)
    SELECT 'init-' || id, id, updatedAt, 'aporte', invested FROM holdings
    WHERE invested > 0 AND NOT EXISTS (SELECT 1 FROM holding_moves m WHERE m.holdingId = holdings.id)`);
  // Versão 6: o app virou só investimentos. Some tudo de extrato, gastos, metas e renda.
  for (const t of ['transactions', 'user_rules', 'bills', 'goals', 'income_sources', 'income_runs', 'month_snapshots']) {
    await db.run(`DROP TABLE IF EXISTS ${t}`);
  }
  const cols = await db.all<{ name: string }>(`PRAGMA table_info(holdings)`);
  if (!cols.some((c) => c.name === 'symbol')) await db.run(`ALTER TABLE holdings ADD COLUMN symbol TEXT`);
  await db.run(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`,
    [String(SCHEMA_VERSION)],
  );
}
