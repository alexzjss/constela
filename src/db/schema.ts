import type { Db } from './db';

export const SCHEMA_VERSION = 2;

export async function migrate(db: Db): Promise<void> {
  await db.run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    kind TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    externalId TEXT UNIQUE,
    needsReview INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date)`);
  await db.run(`CREATE TABLE IF NOT EXISTS user_rules (
    key TEXT PRIMARY KEY,
    categoryId TEXT NOT NULL
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    dueDay INTEGER NOT NULL,
    categoryId TEXT NOT NULL
  )`);
  await db.run(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`,
    [String(SCHEMA_VERSION)],
  );
}
