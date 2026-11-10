import type { IncomeSource } from '../../src/domain/types';
import { dueRuns, expectedFromSources, incomeBreakdown, payDate } from '../../src/engine/income';
import { tx } from '../helpers/tx';

const src = (o: Partial<IncomeSource> = {}): IncomeSource => ({
  id: 's1', name: 'Bolsa', type: 'bolsa', amount: 160000, day: 5,
  startMonth: '2026-09', endMonth: null, active: true, ...o,
});

test('payDate usa o último dia em meses curtos', () => {
  expect(payDate('2026-02', 31)).toBe('2026-02-28');
  expect(payDate('2026-11', 5)).toBe('2026-11-05');
});

test('dueRuns: meses vencidos desde o início, sem o que já foi lançado nem o futuro', () => {
  const runs = dueRuns([src()], new Set(['s1|2026-09']), '2026-11-10');
  expect(runs.map((r) => r.date)).toEqual(['2026-10-05', '2026-11-05']);
});

test('dueRuns: dia ainda não chegou no mês atual', () => {
  expect(dueRuns([src({ day: 25 })], new Set(), '2026-11-10').map((r) => r.month)).toEqual(['2026-09', '2026-10']);
});

test('dueRuns respeita fim, pausa e virada de ano', () => {
  expect(dueRuns([src({ endMonth: '2026-09' })], new Set(), '2026-11-10')).toHaveLength(1);
  expect(dueRuns([src({ active: false })], new Set(), '2026-11-10')).toEqual([]);
  expect(dueRuns([src({ startMonth: '2026-12' })], new Set(), '2027-01-10').map((r) => r.date)).toEqual(['2026-12-05', '2027-01-05']);
});

test('expectedFromSources soma só as fontes ativas no mês', () => {
  const list = [src(), src({ id: 's2', amount: 50000, startMonth: '2027-01' }), src({ id: 's3', active: false })];
  expect(expectedFromSources(list, '2026-11')).toBe(160000);
});

test('incomeBreakdown agrupa ganhos do mês por categoria', () => {
  const b = incomeBreakdown([
    tx('2026-11-05', 160000, 'income', 'bolsa'), tx('2026-11-20', 30000, 'income', 'freelance'),
    tx('2026-11-21', 5000, 'expense', 'comida'), tx('2026-10-05', 99999, 'income', 'bolsa'),
  ], '2026-11');
  expect(b.total).toBe(190000);
  expect(b.byType[0]).toEqual({ categoryId: 'bolsa', amount: 160000 });
});
