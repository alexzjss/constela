import { parsePhrase } from '../../src/parser/phrase';

const T = '2026-11-09';

test('gasto simples', () => {
  expect(parsePhrase('gastei 35 no almoço', T, {})).toEqual({
    kind: 'expense', amount: 3500, date: T, categoryId: 'comida', description: 'gastei no almoço',
  });
});

test('milhar, vírgula e R$', () => {
  const d = parsePhrase('paguei R$ 1.200,50 de aluguel', T, {});
  expect(d?.amount).toBe(120050);
  expect(d?.categoryId).toBe('moradia');
});

test('ganho com data relativa', () => {
  const d = parsePhrase('recebi 300 de freela ontem', T, {});
  expect(d?.kind).toBe('income');
  expect(d?.date).toBe('2026-11-08');
  expect(d?.categoryId).toBe('renda');
});

test('dia N: maior que hoje cai no mês anterior', () => {
  expect(parsePhrase('gastei 20 dia 30', T, {})?.date).toBe('2026-10-30');
  expect(parsePhrase('gastei 20 dia 5', T, {})?.date).toBe('2026-11-05');
});

test('sem valor não cria lançamento', () => {
  expect(parsePhrase('almoço', T, {})).toBeNull();
  expect(parsePhrase('', T, {})).toBeNull();
});

test('regra do usuário muda a categoria', () => {
  const rules = { 'gastei no rei do milho': 'lazer' };
  expect(parsePhrase('gastei 12 no rei do milho', T, rules)?.categoryId).toBe('lazer');
});
