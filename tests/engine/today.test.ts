import { canSpendToday } from '../../src/engine/today';
import { tx } from '../helpers/tx';
import type { Bill } from '../../src/domain/types';

const bills: Bill[] = [
  { id: 'b1', name: 'Internet', amount: 8000, dueDay: 15, categoryId: 'contas' },
  { id: 'b2', name: 'Aluguel', amount: 50000, dueDay: 5, categoryId: 'moradia' },
];

test('desconta o gasto e as contas por vencer, e divide pelos dias restantes', () => {
  const r = canSpendToday({
    today: '2026-11-10', expectedIncome: 160000, bills,
    txs: [tx('2026-11-03', 20000, 'expense', 'comida')],
  });
  // 160000 - 20000 - 8000 (só a internet ainda vence) = 132000; 21 dias restantes
  expect(r).toEqual({ available: 132000, daysLeft: 21, amount: 6285 });
});

test('conta que vence hoje ainda conta como pendente', () => {
  const r = canSpendToday({ today: '2026-11-15', expectedIncome: 100000, bills, txs: [] });
  expect(r?.available).toBe(92000);
});

test('internal e ganhos não entram no gasto', () => {
  const r = canSpendToday({
    today: '2026-11-10', expectedIncome: 100000, bills: [],
    txs: [tx('2026-11-02', 50000, 'internal', 'reserva'), tx('2026-11-02', 9000, 'income', 'renda')],
  });
  expect(r?.available).toBe(100000);
});

test('nunca fica negativo', () => {
  const r = canSpendToday({
    today: '2026-11-10', expectedIncome: 10000, bills: [],
    txs: [tx('2026-11-03', 90000, 'expense', 'comida')],
  });
  expect(r).toMatchObject({ available: -80000, amount: 0 });
});

test('sem renda esperada não há resposta', () => {
  expect(canSpendToday({ today: '2026-11-10', expectedIncome: 0, bills: [], txs: [] })).toBeNull();
});

test('último dia do mês divide por 1', () => {
  const r = canSpendToday({ today: '2026-11-30', expectedIncome: 100000, bills: [], txs: [tx('2026-11-03', 40000, 'expense', 'comida')] });
  expect(r?.daysLeft).toBe(1);
  expect(r?.amount).toBe(60000);
});

import { expectedMonthlyIncome } from '../../src/engine/today';

test('renda esperada: o valor digitado vence', () => {
  expect(expectedMonthlyIncome([tx('2026-10-05', 90000, 'income', 'renda')], '2026-11-10', 160000)).toBe(160000);
});

test('renda esperada: sem valor digitado usa a mediana dos 3 meses anteriores', () => {
  const txs = [
    tx('2026-08-05', 100000, 'income', 'renda'), tx('2026-09-05', 160000, 'income', 'renda'),
    tx('2026-10-05', 120000, 'income', 'renda'), tx('2026-10-06', 50000, 'internal', 'reserva'),
  ];
  expect(expectedMonthlyIncome(txs, '2026-11-10', null)).toBe(120000);
});

test('renda esperada: sem nada vira 0', () => {
  expect(expectedMonthlyIncome([], '2026-11-10', null)).toBe(0);
});
