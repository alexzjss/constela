import type { Holding } from '../../src/domain/types';
import { applyMove, gainPct, summarizeHoldings } from '../../src/engine/holdings';

const h = (o: Partial<Holding> = {}): Holding => ({
  id: 'h1', type: 'tesouro', name: 'Selic', invested: 100000, value: 110000, updatedAt: '2026-11-01', ...o,
});

test('summarizeHoldings agrupa por tipo e soma rendimento', () => {
  const s = summarizeHoldings([h(), h({ id: 'h2', type: 'cdb', invested: 50000, value: 52000 }), h({ id: 'h3', invested: 0, value: 5000 })]);
  expect(s.groups.map((g) => g.type)).toEqual(['tesouro', 'cdb']);
  expect(s).toMatchObject({ invested: 150000, value: 167000, gain: 17000 });
});

test('gainPct', () => {
  expect(gainPct(100000, 110000)).toBeCloseTo(0.1);
  expect(gainPct(0, 5000)).toBeNull();
});

test('aporte soma nos dois lados; resgate sai pelo custo médio', () => {
  expect(applyMove(h(), 'aporte', 20000, '2026-11-10')).toMatchObject({ invested: 120000, value: 130000 });
  expect(applyMove(h(), 'resgate', 55000, '2026-11-10')).toMatchObject({ invested: 50000, value: 55000 });
  expect(applyMove(h(), 'resgate', 999999, '2026-11-10')).toMatchObject({ invested: 0, value: 0 });
});
