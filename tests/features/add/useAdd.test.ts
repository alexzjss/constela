import { memoryDb } from '../../helpers/memoryDb';
import { migrate } from '../../../src/db/schema';
import { getUserRules, listTransactions } from '../../../src/db/repo';
import { useAddCore } from '../../../src/features/add/useAdd';
import type { Db } from '../../../src/db/db';

const T = '2026-11-09';
const fakeDb: Db = { run: async () => {}, all: async <R,>() => [] as R[] };

test('frase vira rascunho e salva o lançamento', async () => {
  const db = await memoryDb();
  await migrate(db);
  const h = useAddCore(db, T);
  h.setText('gastei 35 no almoço');
  expect(h.canSave).toBe(true);
  expect(h.draft).toMatchObject({ kind: 'expense', amount: 3500, categoryId: 'comida', date: T });
  await h.save();
  const saved = await listTransactions(db, T, T);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ amount: 3500, source: 'text', categoryId: 'comida' });
});

test('trocar a categoria ensina a regra', async () => {
  const db = await memoryDb();
  await migrate(db);
  const h = useAddCore(db, T);
  h.setText('gastei 12 no rei do milho');
  h.setCategory('lazer');
  await h.save();
  expect(Object.values(await getUserRules(db))).toContain('lazer');
});

test('sem valor não salva', () => {
  const h = useAddCore(fakeDb, T);
  h.setText('almoço');
  expect(h.canSave).toBe(false);
  expect(h.draft).toBeNull();
});

test('teclado numérico define o valor sem frase', async () => {
  const db = await memoryDb();
  await migrate(db);
  const h = useAddCore(db, T);
  h.setAmount(2500);
  h.setCategory('transporte');
  expect(h.canSave).toBe(true);
  await h.save();
  expect((await listTransactions(db, T, T))[0]).toMatchObject({ amount: 2500, source: 'form', categoryId: 'transporte' });
});

test('trocar para Ganho ajusta a categoria para uma de ganho', () => {
  const h = useAddCore(fakeDb, T);
  h.setText('gastei 100 de freela');
  h.setKind('income');
  expect(h.draft?.kind).toBe('income');
  expect(h.draft?.categoryId).toBe('renda');
});

test('apagar o campo de valor impede salvar o valor antigo', () => {
  const h = useAddCore(fakeDb, T);
  h.setAmount(5000);
  expect(h.canSave).toBe(true);
  h.setAmount(0);
  expect(h.canSave).toBe(false);
});
