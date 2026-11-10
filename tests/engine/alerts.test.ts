import { topAlert } from '../../src/engine/alerts';
import { tx } from '../helpers/tx';

const history = (amounts: number[]) =>
  ['2026-08-05', '2026-09-05', '2026-10-05'].map((d, i) => tx(d, amounts[i], 'expense', 'lazer'));

test('avisa quando a categoria passa de 130% do usual e a diferença é grande', () => {
  const a = topAlert([...history([10000, 12000, 11000]), tx('2026-11-04', 30000, 'expense', 'lazer')], '2026-11-09');
  expect(a).toEqual({ categoryId: 'lazer', current: 30000, usual: 11000 });
});

test('não avisa com menos de 2 meses de histórico', () => {
  const only = [tx('2026-10-05', 10000, 'expense', 'lazer'), tx('2026-11-04', 90000, 'expense', 'lazer')];
  expect(topAlert(only, '2026-11-09')).toBeNull();
});

test('não avisa por diferença pequena (< R$ 50)', () => {
  const small = [...history([1000, 1000, 1000]), tx('2026-11-04', 4000, 'expense', 'lazer')];
  expect(topAlert(small, '2026-11-09')).toBeNull();
});

test('só compara até o mesmo dia do mês', () => {
  const late = [...history([10000, 10000, 10000]), tx('2026-10-25', 50000, 'expense', 'lazer'), tx('2026-11-04', 11000, 'expense', 'lazer')];
  expect(topAlert(late, '2026-11-09')).toBeNull();
});

test('ignora Cartão e devolve o maior alerta', () => {
  const base = [
    ...history([10000, 10000, 10000]),
    ...['2026-08-05', '2026-09-05', '2026-10-05'].map((d) => tx(d, 10000, 'expense', 'comida')),
    ...['2026-08-05', '2026-09-05', '2026-10-05'].map((d) => tx(d, 1000, 'expense', 'cartao')),
  ];
  const a = topAlert([...base, tx('2026-11-04', 20000, 'expense', 'lazer'), tx('2026-11-04', 40000, 'expense', 'comida'), tx('2026-11-04', 90000, 'expense', 'cartao')], '2026-11-09');
  expect(a?.categoryId).toBe('comida');
});
