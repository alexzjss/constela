import { memoryDb } from '../helpers/memoryDb';
import { migrate } from '../../src/db/schema';
import {
  addBill, listBills, deleteBill, getSetting, setSetting, insertTransaction, exportAll,
  importBackup, listTransactions, setUserRule, getUserRules,
} from '../../src/db/repo';

async function fresh() {
  const db = await memoryDb();
  await migrate(db);
  return db;
}

test('contas fixas: adicionar, listar por vencimento, apagar', async () => {
  const db = await fresh();
  await addBill(db, { name: 'Internet', amount: 8000, dueDay: 15, categoryId: 'contas' });
  const b = await addBill(db, { name: 'Aluguel', amount: 50000, dueDay: 5, categoryId: 'moradia' });
  expect((await listBills(db)).map((x) => x.name)).toEqual(['Aluguel', 'Internet']);
  await deleteBill(db, b.id);
  expect((await listBills(db)).map((x) => x.name)).toEqual(['Internet']);
});

test('configurações: lê, grava e sobrescreve', async () => {
  const db = await fresh();
  expect(await getSetting(db, 'monthlyIncome')).toBeNull();
  await setSetting(db, 'monthlyIncome', '160000');
  await setSetting(db, 'monthlyIncome', '170000');
  expect(await getSetting(db, 'monthlyIncome')).toBe('170000');
});

test('backup: ida e volta sem perder nem duplicar', async () => {
  const a = await fresh();
  await insertTransaction(a, {
    kind: 'expense', amount: 3500, date: '2026-11-03', categoryId: 'comida', description: 'almoço', source: 'text',
  });
  await addBill(a, { name: 'Internet', amount: 8000, dueDay: 15, categoryId: 'contas' });
  await setSetting(a, 'monthlyIncome', '160000');
  await setUserRule(a, 'padaria', 'lazer');
  const dump = await exportAll(a);

  const b = await fresh();
  expect(await importBackup(b, dump)).toEqual({ added: 1, skipped: 0 });
  expect(await importBackup(b, dump)).toEqual({ added: 0, skipped: 1 });
  expect(await listTransactions(b, '2026-11-01', '2026-11-30')).toHaveLength(1);
  expect(await listBills(b)).toHaveLength(1);
  expect(await getSetting(b, 'monthlyIncome')).toBe('160000');
  expect(await getUserRules(b)).toEqual({ padaria: 'lazer' });
});

test('backup inválido é recusado', async () => {
  const db = await fresh();
  await expect(importBackup(db, { version: 9 } as never)).rejects.toThrow();
  await expect(importBackup(db, null as never)).rejects.toThrow();
});
