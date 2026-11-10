import { provisionalScore } from '../../src/engine/score';
import { addDays } from '../../src/lib/dates';
import { tx } from '../helpers/tx';

const TODAY = '2026-11-09';

function fixture() {
  const txs = [
    tx('2026-10-12', 100000, 'income', 'renda'),
    tx('2026-10-15', 68600, 'expense', 'moradia'),
  ];
  for (let i = 0; i < 14; i++) txs.push(tx(addDays(TODAY, -i), 100, 'expense', 'comida'));
  return txs;
}

test('folga máxima quando sobram 30% da renda', () => {
  const s = provisionalScore(fixture(), TODAY);
  expect(s.folga).toBe(30);
  expect(s.provisional).toBe(true);
});

test('registros em dia dão pontos de constância', () => {
  const full = provisionalScore(fixture(), TODAY);
  const none = provisionalScore([tx('2026-10-12', 100000, 'income', 'renda')], TODAY);
  expect(full.constancia).toBeGreaterThan(none.constancia);
  expect(full.constancia).toBeLessThanOrEqual(20);
});

test('renda zero zera a folga, sem NaN', () => {
  const s = provisionalScore([tx('2026-11-08', 100, 'expense', 'comida')], TODAY);
  expect(s.folga).toBe(0);
  expect(Number.isFinite(s.total)).toBe(true);
});

test('sem nenhum lançamento o total é um inteiro de 0 a 100', () => {
  const s = provisionalScore([], TODAY);
  expect(Number.isInteger(s.total)).toBe(true);
  expect(s.total).toBeGreaterThanOrEqual(0);
  expect(s.total).toBeLessThanOrEqual(100);
});

test('total é (folga + constância) * 2', () => {
  const s = provisionalScore(fixture(), TODAY);
  expect(s.total).toBe(Math.round((s.folga + s.constancia) * 2));
});

test('aluguel (essencial) no começo do mês não derruba a estabilidade', () => {
  const history = ['2026-08-10', '2026-09-10', '2026-10-10'].map((d) => tx(d, 300000, 'expense', 'lazer'));
  const base = [...history, tx('2026-11-05', 10000, 'expense', 'lazer'), tx('2026-10-12', 100000, 'income', 'renda')];
  const withRent = [...base, tx('2026-11-05', 150000, 'expense', 'moradia')];
  expect(provisionalScore(withRent, TODAY).constancia).toBe(provisionalScore(base, TODAY).constancia);
});

test('um CSV cobre os dias do período, mesmo sem movimento', () => {
  const edges = (src: 'csv' | 'form') =>
    [tx('2026-10-20', 1000, 'expense', 'comida', src), tx('2026-11-09', 1000, 'expense', 'comida', src)];
  expect(provisionalScore(edges('csv'), TODAY).constancia).toBeGreaterThan(provisionalScore(edges('form'), TODAY).constancia);
});
