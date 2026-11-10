import { monthSummary } from '../../src/engine/month';
import { tx } from '../helpers/tx';

test('internal fica fora de renda e gasto', () => {
  const s = monthSummary(
    [tx('2026-11-02', 50000, 'internal', 'reserva'), tx('2026-11-03', 3500, 'expense', 'comida')],
    '2026-11', '2026-11-09',
  );
  expect(s.spent).toBe(3500);
  expect(s.income).toBe(0);
});

test('byCategory ordenado do maior para o menor', () => {
  const s = monthSummary(
    [tx('2026-11-02', 1000, 'expense', 'lazer'), tx('2026-11-03', 5000, 'expense', 'comida'),
      tx('2026-11-04', 2000, 'expense', 'comida')],
    '2026-11', '2026-11-09',
  );
  expect(s.byCategory).toEqual([
    { categoryId: 'comida', amount: 7000 }, { categoryId: 'lazer', amount: 1000 },
  ]);
});

test('fantasma compara o mesmo dia do mês anterior', () => {
  const s = monthSummary(
    [tx('2026-10-05', 20000, 'expense', 'comida'), tx('2026-10-20', 90000, 'expense', 'comida'),
      tx('2026-11-03', 15000, 'expense', 'comida')],
    '2026-11', '2026-11-09',
  );
  expect(s.ghost).toEqual({ month: '2026-10', spentSameDay: 20000, diff: 5000 });
});

test('fantasma no dia 31 com mês anterior de 30 dias', () => {
  const s = monthSummary(
    [tx('2026-11-30', 1000, 'expense', 'comida'), tx('2026-12-31', 500, 'expense', 'comida')],
    '2026-12', '2026-12-31',
  );
  expect(s.ghost).toEqual({ month: '2026-11', spentSameDay: 1000, diff: 500 });
});

test('sem lançamento no mês anterior não há fantasma', () => {
  const s = monthSummary([tx('2026-11-03', 3500, 'expense', 'comida')], '2026-11', '2026-11-09');
  expect(s.ghost).toBeNull();
});
