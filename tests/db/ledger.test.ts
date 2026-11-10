import { memoryDb } from '../helpers/memoryDb';
import { migrate } from '../../src/db/schema';
import {
  addHolding, addIncomeSource, deleteHolding, deleteIncomeSource, listHoldingMoves, getMonthSnapshot, listHoldings, listIncomeSources,
  saveMonthSnapshot, updateIncomeSource,
} from '../../src/db/ledger';
import {
  deleteSetting, deleteTransaction, exportAll, getSetting, getTransaction, importBackup, insertTransaction,
  listTransactions, setSetting, updateTransaction,
} from '../../src/db/repo';
import { createHolding, materializeIncome, incomeSetting, moveHolding } from '../../src/features/ledger/actions';

async function fresh() {
  const db = await memoryDb();
  await migrate(db);
  return db;
}
const bolsa = { name: 'Bolsa', type: 'bolsa' as const, amount: 160000, day: 5, startMonth: '2026-09', endMonth: null, active: true };

test('editar e apagar lançamento', async () => {
  const db = await fresh();
  const t = await insertTransaction(db, { kind: 'expense', amount: 3500, date: '2026-11-01', categoryId: 'comida', description: 'almoço', source: 'text' });
  await updateTransaction(db, t.id, { kind: 'income', amount: 9000, date: '2026-11-02', categoryId: 'freelance', description: 'job' });
  expect(await getTransaction(db, t.id)).toMatchObject({ kind: 'income', amount: 9000, date: '2026-11-02', categoryId: 'freelance', needsReview: false });
  await deleteTransaction(db, t.id);
  expect(await getTransaction(db, t.id)).toBeNull();
});

test('materializeIncome lança meses vencidos uma única vez', async () => {
  const db = await fresh();
  await addIncomeSource(db, bolsa);
  expect(await materializeIncome(db, '2026-11-10')).toBe(3);
  expect(await materializeIncome(db, '2026-11-10')).toBe(0);
  const txs = await listTransactions(db, '2026-09-01', '2026-11-30');
  expect(txs).toHaveLength(3);
  expect(txs[0]).toMatchObject({ kind: 'income', categoryId: 'bolsa', amount: 160000, date: '2026-11-05' });
});

test('apagar um lançamento recorrente não o recria', async () => {
  const db = await fresh();
  await addIncomeSource(db, bolsa);
  await materializeIncome(db, '2026-11-10');
  const [first] = await listTransactions(db, '2026-11-01', '2026-11-30');
  await deleteTransaction(db, first.id);
  await materializeIncome(db, '2026-11-20');
  expect(await listTransactions(db, '2026-11-01', '2026-11-30')).toHaveLength(0);
});

test('mudar o valor da fonte vale só para meses novos', async () => {
  const db = await fresh();
  const s = await addIncomeSource(db, { ...bolsa, startMonth: '2026-10' });
  await materializeIncome(db, '2026-10-10');
  await updateIncomeSource(db, { ...s, amount: 200000 });
  await materializeIncome(db, '2026-11-10');
  const txs = await listTransactions(db, '2026-10-01', '2026-11-30');
  expect(txs.map((t) => t.amount)).toEqual([200000, 160000]);
  await deleteIncomeSource(db, s.id);
  expect(await listIncomeSources(db)).toEqual([]);
  expect(txs).toHaveLength(2);
});

test('incomeSetting: digitado > soma das fontes > null', async () => {
  const db = await fresh();
  expect(await incomeSetting(db, '2026-11')).toBeNull();
  await addIncomeSource(db, bolsa);
  expect(await incomeSetting(db, '2026-11')).toBe(160000);
  await setSetting(db, 'monthlyIncome', '250000');
  expect(await incomeSetting(db, '2026-11')).toBe(250000);
});

test('aporte e resgate atualizam a posição e geram lançamento interno', async () => {
  const db = await fresh();
  const h = await addHolding(db, { type: 'tesouro', name: 'Selic', invested: 100000, value: 100000, updatedAt: '2026-11-01' });
  const after = await moveHolding(db, h, 'aporte', 20000, '2026-11-10');
  await moveHolding(db, after, 'resgate', 60000, '2026-11-11');
  expect((await listHoldings(db))[0]).toMatchObject({ invested: 60000, value: 60000 });
  const txs = await listTransactions(db, '2026-11-01', '2026-11-30');
  expect(txs.map((t) => [t.kind, t.amount, t.description])).toEqual([
    ['internal', 60000, 'Resgate Selic'], ['internal', 20000, 'Aporte Selic'],
  ]);
});

test('fotografia do mês: vazia por padrão, salva e atualiza', async () => {
  const db = await fresh();
  expect(await getMonthSnapshot(db, '2026-10')).toEqual({ month: '2026-10', accountBalance: null, invested: null });
  await saveMonthSnapshot(db, { month: '2026-10', accountBalance: 123400, invested: null });
  await saveMonthSnapshot(db, { month: '2026-10', accountBalance: 123400, invested: 50000 });
  expect(await getMonthSnapshot(db, '2026-10')).toMatchObject({ accountBalance: 123400, invested: 50000 });
});

test('deleteSetting remove o ajuste', async () => {
  const db = await fresh();
  await setSetting(db, 'accountBalance', '100');
  await deleteSetting(db, 'accountBalance');
  expect(await getSetting(db, 'accountBalance')).toBeNull();
});

test('backup leva ganhos recorrentes, investimentos e fotografias, sem duplicar', async () => {
  const a = await fresh();
  await addIncomeSource(a, bolsa);
  await materializeIncome(a, '2026-11-10');
  await addHolding(a, { type: 'cdb', name: 'CDB', invested: 1, value: 2, updatedAt: '2026-11-01' });
  await saveMonthSnapshot(a, { month: '2026-10', accountBalance: 5, invested: 6 });
  await setSetting(a, 'accountBalance', '777');
  const dump = JSON.parse(JSON.stringify(await exportAll(a)));
  const b = await fresh();
  await importBackup(b, dump);
  await importBackup(b, dump);
  expect(await listIncomeSources(b)).toHaveLength(1);
  expect(await listHoldings(b)).toHaveLength(1);
  expect(await getMonthSnapshot(b, '2026-10')).toMatchObject({ accountBalance: 5, invested: 6 });
  expect(await getSetting(b, 'accountBalance')).toBe('777');
  expect(await materializeIncome(b, '2026-11-10')).toBe(0); // runs vieram junto: não relança
});

test('aporte e resgate guardam movimentos datados; excluir leva junto', async () => {
  const db = await fresh();
  const h = await createHolding(db, { type: 'cdb', name: 'CDB', invested: 100000, value: 100000 }, '2026-11-10', '2026-08-01');
  const after = await moveHolding(db, h, 'aporte', 20000, '2026-11-10');
  await moveHolding(db, after, 'resgate', 30000, '2026-11-11');
  expect((await listHoldingMoves(db)).map((m) => [m.date, m.kind, m.amount])).toEqual([
    ['2026-08-01', 'aporte', 100000], ['2026-11-10', 'aporte', 20000], ['2026-11-11', 'resgate', 30000],
  ]);
  await deleteHolding(db, h.id);
  expect(await listHoldingMoves(db)).toEqual([]);
});

test('migrate cria aporte inicial para posição antiga, uma vez só', async () => {
  const db = await fresh();
  await db.run(`INSERT INTO holdings (id, type, name, invested, value, updatedAt) VALUES ('old', 'cdb', 'CDB', 5000, 5500, '2026-10-01')`);
  await migrate(db);
  await migrate(db);
  expect(await listHoldingMoves(db)).toEqual([{ id: 'init-old', holdingId: 'old', date: '2026-10-01', kind: 'aporte', amount: 5000 }]);
});

test('ganho recorrente leva externalId inc:, e backup leva os movimentos', async () => {
  const a = await fresh();
  await addIncomeSource(a, bolsa);
  await materializeIncome(a, '2026-11-10');
  const txs = await listTransactions(a, '2026-09-01', '2026-11-30');
  expect(txs.every((t) => t.externalId?.startsWith('inc:'))).toBe(true);
  await createHolding(a, { type: 'cdb', name: 'CDB', invested: 100, value: 100 }, '2026-11-10');
  const dump = JSON.parse(JSON.stringify(await exportAll(a)));
  const b = await fresh();
  await importBackup(b, dump);
  await importBackup(b, dump);
  expect(await listHoldingMoves(b)).toHaveLength(1);
});
