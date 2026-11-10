import { migrate } from '../../src/db/schema';
import { memoryDb } from '../helpers/memoryDb';

test('migrar tira as tabelas antigas e mantém as posições', async () => {
  const d = await memoryDb();
  await d.run(`CREATE TABLE transactions (id TEXT PRIMARY KEY)`);
  await d.run(`CREATE TABLE goals (id TEXT PRIMARY KEY)`);
  // banco da versão 5: holdings sem a coluna symbol
  await d.run(`CREATE TABLE holdings (id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL,
    invested INTEGER NOT NULL, value INTEGER NOT NULL, updatedAt TEXT NOT NULL)`);
  await d.run(`INSERT INTO holdings VALUES ('h1', 'tesouro', 'Selic', 1000, 1100, '2026-11-01')`);
  await migrate(d);
  await migrate(d); // idempotente
  const tables = (await d.all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)).map((t) => t.name);
  expect(tables).not.toContain('transactions');
  expect(tables).not.toContain('goals');
  const rows = await d.all<{ id: string; symbol: string | null }>(`SELECT id, symbol FROM holdings`);
  expect(rows).toEqual([{ id: 'h1', symbol: null }]);
  const moves = await d.all(`SELECT * FROM holding_moves`);
  expect(moves).toHaveLength(1); // aporte inicial da posição antiga
});
