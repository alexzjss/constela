import type { Holding, HoldingMove } from '../../src/domain/types';
import { performance, rateIndex, seriesIndex } from '../../src/engine/performance';

const h = (value: number): Holding => ({ id: 'h', type: 'tesouro', name: 'Selic', invested: 100000, value, updatedAt: '2026-11-01' });
const mv = (date: string, kind: 'aporte' | 'resgate', amount: number): HoldingMove => ({ id: date + kind, holdingId: 'h', date, kind, amount });

test('seriesIndex compõe só as datas dentro de (from, to]', () => {
  const idx = seriesIndex([['2026-01-02', 1], ['2026-01-03', 1], ['2026-01-04', 1]]);
  expect(idx.factor('2026-01-02', '2026-01-04')).toBeCloseTo(1.01 * 1.01);
  expect(idx.factor('2026-01-04', '2026-01-04')).toBe(1);
});

test('rateIndex: taxa anual por dias corridos', () => {
  expect(rateIndex(0.1).factor('2025-11-10', '2026-11-10')).toBeCloseTo(1.1);
  expect(rateIndex(0.1).estimated).toBe(true);
});

test('acima do CDI: mesmo fluxo, valor maior', () => {
  const cdi = seriesIndex([['2026-09-01', 5]]); // +5% no período
  const p = performance(h(110000), [mv('2026-08-01', 'aporte', 100000)], '2026-11-10', cdi, null);
  expect(p).toMatchObject({ contributed: 100000, gain: 10000, cdiValue: 105000, vsCdi: 5000, verdict: 'acima' });
  expect(p.gainPct).toBeCloseTo(0.1);
});

test('abaixo do CDI e resgate entra com sinal negativo', () => {
  const cdi = seriesIndex([['2026-09-01', 10]]);
  const moves = [mv('2026-08-01', 'aporte', 100000), mv('2026-10-01', 'resgate', 50000)];
  const p = performance(h(52000), moves, '2026-11-10', cdi, null);
  expect(p.contributed).toBe(50000);
  expect(p.cdiValue).toBe(60000); // 110000 − 50000
  expect(p.verdict).toBe('abaixo');
});

test('muito cedo, sem dados e inflação', () => {
  const cdi = seriesIndex([]);
  expect(performance(h(100500), [mv('2026-11-01', 'aporte', 100000)], '2026-11-10', cdi, null).verdict).toBe('cedo');
  expect(performance(h(1), [], '2026-11-10', cdi, null).verdict).toBe('sem-dados');
  expect(performance(h(110000), [mv('2026-08-01', 'aporte', 100000)], '2026-11-10', null, null).verdict).toBe('sem-dados');
  const ipca = seriesIndex([['2026-09-01', 2]]);
  expect(performance(h(110000), [mv('2026-08-01', 'aporte', 100000)], '2026-11-10', null, ipca).beatsInflation).toBe(true);
});
