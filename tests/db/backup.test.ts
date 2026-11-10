import { addHolding, addHoldingMove } from '../../src/db/holdings';
import { exportAll, importBackup, setSetting } from '../../src/db/repo';
import { migrate } from '../../src/db/schema';
import { memoryDb } from '../helpers/memoryDb';

async function db() {
  const d = await memoryDb();
  await migrate(d);
  return d;
}

test('backup faz ida e volta sem duplicar e deixa a chave de IA de fora', async () => {
  const a = await db();
  const h = await addHolding(a, { type: 'acoes', name: 'PETR4', invested: 1000, value: 1200, updatedAt: '2026-11-01', symbol: 'PETR4.SA' });
  await addHoldingMove(a, { holdingId: h.id, date: '2026-11-01', kind: 'aporte', amount: 1000 });
  await setSetting(a, 'invest.profile', 'arrojado');
  await setSetting(a, 'ai.key', 'segredo');
  const dump = await exportAll(a);
  expect(JSON.stringify(dump)).not.toContain('segredo');

  const b = await db();
  expect(await importBackup(b, dump)).toEqual({ added: 1, skipped: 0 });
  expect(await importBackup(b, dump)).toEqual({ added: 0, skipped: 1 });
  expect((await exportAll(b)).holdings[0].symbol).toBe('PETR4.SA');
  expect((await exportAll(b)).settings['invest.profile']).toBe('arrojado');
});

test('backup inválido é recusado', async () => {
  await expect(importBackup(await db(), { version: 1 } as never)).rejects.toThrow('Backup inválido.');
});
