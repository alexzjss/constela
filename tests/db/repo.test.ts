import { readFileSync } from 'fs';
import { memoryDb } from '../helpers/memoryDb';
import { migrate } from '../../src/db/schema';
import {
  insertTransaction, importRows, listTransactions, getUserRules, setUserRule, exportAll,
} from '../../src/db/repo';
import { parseNubankCsv } from '../../src/ingest/nubank';

const sample = () => parseNubankCsv(readFileSync('data/samples/nubank-exemplo.csv', 'utf8'), {});

test('importar duas vezes não duplica', async () => {
  const db = await memoryDb();
  await migrate(db);
  const rows = sample();
  expect(await importRows(db, rows)).toEqual({ added: rows.length, skipped: 0 });
  expect(await importRows(db, rows)).toEqual({ added: 0, skipped: rows.length });
  expect(await listTransactions(db, '2026-10-01', '2026-10-31')).toHaveLength(rows.length);
});

test('arquivos sobrepostos: só entra o que é novo', async () => {
  const db = await memoryDb();
  await migrate(db);
  const rows = sample();
  await importRows(db, rows.slice(0, 5));
  expect(await importRows(db, rows)).toEqual({ added: rows.length - 5, skipped: 5 });
});

test('migrate é idempotente', async () => {
  const db = await memoryDb();
  await migrate(db);
  await migrate(db);
});

test('insertTransaction grava e listTransactions filtra por data inclusiva', async () => {
  const db = await memoryDb();
  await migrate(db);
  const t = await insertTransaction(db, {
    kind: 'expense', amount: 3500, date: '2026-11-01', categoryId: 'comida',
    description: 'almoço', source: 'text',
  });
  expect(t.id).toBeTruthy();
  expect(await listTransactions(db, '2026-11-01', '2026-11-01')).toHaveLength(1);
  expect(await listTransactions(db, '2026-11-02', '2026-11-30')).toHaveLength(0);
});

test('regras do usuário e exportação', async () => {
  const db = await memoryDb();
  await migrate(db);
  await setUserRule(db, 'padaria morada', 'lazer');
  await setUserRule(db, 'padaria morada', 'comida');
  expect(await getUserRules(db)).toEqual({ 'padaria morada': 'comida' });
  const dump = await exportAll(db);
  expect(dump).toMatchObject({ version: 1, transactions: [], rules: { 'padaria morada': 'comida' } });
});
