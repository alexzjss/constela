import { recommend, type RecommendInput } from '../../../src/engine/invest/recommend';
import { DEFAULT_HYPOTHESES, EMPTY_RATES } from '../../../src/engine/invest/types';

const input: RecommendInput = {
  amount: 1_000_000, profile: 'moderado', term: 12, hyp: DEFAULT_HYPOTHESES,
  rates: { ...EMPTY_RATES, cdi: 0.15, selic: 0.15, tr: 0 },
};

test('escolhe o melhor produto de renda fixa', () => {
  const r = recommend(input);
  expect(r.fixedProduct).toBe('lciLca');
  expect(r.classes.reduce((a, c) => a + c.amount, 0)).toBe(1_000_000);
  expect(r.classes[4]).toMatchObject({ cls: 'cripto', range: { min: 0, max: 7 } });
});

test('conservador não sugere exterior', () => {
  const r = recommend({ ...input, profile: 'conservador' });
  expect(r.classes.find((c) => c.cls === 'exterior')!.range).toBeNull();
});

test('sem taxas ainda calcula o plano', () => {
  const r = recommend({ ...input, rates: EMPTY_RATES });
  expect(r.ranking).toEqual([]);
  expect(r.fixedProduct).toBeNull();
  expect(r.plan.steps.length).toBeGreaterThan(0);
});
