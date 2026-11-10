import { migrate } from '../../src/db/schema';
import { getAllEntries, putEntries } from '../../src/invest/cache';
import { memoryDb } from '../helpers/memoryDb';

test('grava, lê e sobrescreve por chave', async () => {
  const db = await memoryDb();
  await migrate(db);
  await putEntries(db, [
    { key: 'bcb.selic', value: 0.15, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z' },
    { key: 'asset:VOO', value: 500, asOf: '2026-11-07', fetchedAt: '2026-11-09T10:00:00.000Z', extra: { change12m: 0.2, dividendYield: null } },
  ]);
  let all = await getAllEntries(db);
  expect(all).toHaveLength(2);
  expect(all.find((e) => e.key === 'asset:VOO')!.extra).toEqual({ change12m: 0.2, dividendYield: null });

  await putEntries(db, [{ key: 'bcb.selic', value: 0.14, asOf: '2026-11-08', fetchedAt: '2026-11-09T11:00:00.000Z' }]);
  all = await getAllEntries(db);
  expect(all).toHaveLength(2);
  expect(all.find((e) => e.key === 'bcb.selic')!.value).toBe(0.14);
});

test('migrate duas vezes não falha', async () => {
  const db = await memoryDb();
  await migrate(db);
  await migrate(db);
});
