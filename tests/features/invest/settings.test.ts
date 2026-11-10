import { migrate } from '../../../src/db/schema';
import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';
import { loadInvestSettings, saveInvestSettings } from '../../../src/features/invest/settings';
import { setSetting } from '../../../src/db/repo';
import { memoryDb } from '../../helpers/memoryDb';

async function db() {
  const d = await memoryDb();
  await migrate(d);
  return d;
}

test('padrões em banco vazio', async () => {
  expect(await loadInvestSettings(await db())).toEqual({
    profile: 'moderado', term: 12, amountOverride: null, hyp: DEFAULT_HYPOTHESES,
  });
});

test('ida e volta de cada campo', async () => {
  const d = await db();
  await saveInvestSettings(d, {
    profile: 'arrojado', term: 24, amountOverride: 123400,
    hyp: { cdbPctCdi: 1.1, lciPctCdi: 0.85, custodyPct: 0.001 },
  });
  expect(await loadInvestSettings(d)).toEqual({
    profile: 'arrojado', term: 24, amountOverride: 123400,
    hyp: { cdbPctCdi: 1.1, lciPctCdi: 0.85, custodyPct: 0.001 },
  });
});

test('amountOverride null limpa o valor', async () => {
  const d = await db();
  await saveInvestSettings(d, { amountOverride: 5000 });
  await saveInvestSettings(d, { amountOverride: null });
  expect((await loadInvestSettings(d)).amountOverride).toBeNull();
});

test('valores inválidos voltam ao padrão', async () => {
  const d = await db();
  await setSetting(d, 'invest.term', '7');
  await setSetting(d, 'invest.profile', 'louco');
  await setSetting(d, 'invest.cdbPctCdi', 'abc');
  const s = await loadInvestSettings(d);
  expect(s.term).toBe(12);
  expect(s.profile).toBe('moderado');
  expect(s.hyp.cdbPctCdi).toBe(1);
});
