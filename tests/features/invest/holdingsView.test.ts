import type { Holding, HoldingMove } from '../../../src/domain/types';
import { buildHoldingsView, headline, pickIndexes } from '../../../src/features/invest/holdingsView';
import type { MarketSnapshot } from '../../../src/invest/refresh';

const q = (value: number) => ({ value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false });
const h = (id: string, value: number): Holding => ({ id, type: 'cdb', name: id, invested: 100000, value, updatedAt: '2026-11-01' });
const mv = (holdingId: string, date: string, amount: number): HoldingMove => ({ id: holdingId + date, holdingId, date, kind: 'aporte', amount });
const snap: MarketSnapshot = { 'bcb.cdi': q(0.1), 'bcb.ipca12m': q(0.05) };

test('sem série usa a taxa de hoje e marca estimativa; sem nada, null', () => {
  expect(pickIndexes(null, snap).cdi?.estimated).toBe(true);
  expect(pickIndexes({ cdi: [['2026-09-01', 1]], ipca: null }, snap).cdi?.estimated).toBe(false);
  expect(pickIndexes(null, {})).toEqual({ cdi: null, ipca: null });
});

test('linhas, total e frase por posição', () => {
  const idx = { cdi: [['2026-09-01', 5]] as [string, number][], ipca: [['2026-09-01', 1]] as [string, number][] };
  const v = buildHoldingsView(
    [h('a', 110000), h('b', 101000)],
    [mv('a', '2026-08-01', 100000), mv('b', '2026-08-01', 100000)],
    idx, snap, '2026-11-10',
  );
  expect(v.rows[0].headline).toMatch(/R\$ 50 acima do CDI/);
  expect(v.rows[1].headline).toMatch(/abaixo do CDI/);
  expect(v.total).toMatchObject({ contributed: 200000, value: 211000, gain: 11000, cdiValue: 210000, vsCdi: 1000, verdict: 'acima' });
  expect(v.summary.value).toBe(211000);
});

test('posição sem movimentos fica de fora do total', () => {
  expect(buildHoldingsView([h('x', 5)], [], null, snap, '2026-11-10').total).toBeNull();
  expect(headline(buildHoldingsView([h('x', 5)], [], null, snap, '2026-11-10').rows[0].perf)).toMatch(/Sem histórico/);
});
