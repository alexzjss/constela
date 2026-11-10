import { memoryDb } from '../helpers/memoryDb';
import { migrate } from '../../src/db/schema';
import { addGoal, listGoals, addToGoal, deleteGoal, exportAll, importBackup } from '../../src/db/repo';

async function fresh() {
  const db = await memoryDb();
  await migrate(db);
  return db;
}
const g = { name: 'Viagem', target: 100000, startDate: '2026-11-01', deadline: '2027-03-01' };

test('metas: criar, guardar, listar, apagar', async () => {
  const db = await fresh();
  const created = await addGoal(db, g);
  expect(created.saved).toBe(0);
  await addToGoal(db, created.id, 2500);
  await addToGoal(db, created.id, 1000);
  expect((await listGoals(db))[0]).toMatchObject({ name: 'Viagem', saved: 3500 });
  await deleteGoal(db, created.id);
  expect(await listGoals(db)).toEqual([]);
});

test('backup leva metas, sem duplicar', async () => {
  const a = await fresh();
  const created = await addGoal(a, g);
  await addToGoal(a, created.id, 500);
  const dump = await exportAll(a);
  const b = await fresh();
  await importBackup(b, dump);
  await importBackup(b, dump);
  expect(await listGoals(b)).toHaveLength(1);
  expect((await listGoals(b))[0].saved).toBe(500);
});
