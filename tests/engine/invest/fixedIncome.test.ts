import { evaluateFixedIncome, rankFixedIncome } from '../../../src/engine/invest/fixedIncome';
import { DEFAULT_HYPOTHESES, EMPTY_RATES, type Rates } from '../../../src/engine/invest/types';

const P = 1_000_000;
const rates: Rates = { ...EMPTY_RATES, cdi: 0.15, selic: 0.15, tr: 0 };
const H = DEFAULT_HYPOTHESES;

test('CDB 100% do CDI, 12 meses', () => {
  const r = evaluateFixedIncome('cdb', P, 12, rates, H)!;
  expect(r.gain).toBe(150000);
  expect(r.ir).toBe(26250);
  expect(r.netProfit).toBe(123750);
  expect(r.finalValue).toBe(1123750);
  expect(r.explain.length).toBeGreaterThan(0);
});

test('LCI/LCA 90% do CDI, sem IR', () => {
  const r = evaluateFixedIncome('lciLca', P, 12, rates, H)!;
  expect(r.ir).toBe(0);
  expect(r.netProfit).toBe(135000);
});

test('Tesouro Selic desconta IR e custódia', () => {
  const r = evaluateFixedIncome('tesouroSelic', P, 12, rates, H)!;
  expect(r.custody).toBe(2300);
  expect(r.netProfit).toBe(121450);
});

test('poupança: 70% da Selic até 8,5%, senão 0,5% a.m.', () => {
  expect(evaluateFixedIncome('poupanca', P, 12, { ...rates, selic: 0.08 }, H)!.gain).toBe(56000);
  expect(evaluateFixedIncome('poupanca', P, 12, rates, H)!.gain).toBe(61678);
});

test('6 meses são 183 dias e pagam 20% de IR', () => {
  const r = evaluateFixedIncome('cdb', P, 6, rates, H)!;
  expect(r.days).toBe(183);
  expect(r.ir).toBe(Math.round(r.gain * 0.2));
});

test('sem taxas devolve null e ranking vazio', () => {
  for (const id of ['poupanca', 'tesouroSelic', 'tesouroPre', 'tesouroIpca', 'cdb', 'lciLca'] as const) {
    expect(evaluateFixedIncome(id, P, 12, EMPTY_RATES, H)).toBeNull();
  }
  expect(rankFixedIncome(P, 12, EMPTY_RATES, H)).toEqual([]);
});

test('ranking ordena por lucro líquido', () => {
  const rank = rankFixedIncome(P, 12, rates, H);
  const ids = rank.map((r) => r.id);
  expect(ids.indexOf('lciLca')).toBeLessThan(ids.indexOf('cdb'));
  for (let i = 1; i < rank.length; i++) expect(rank[i - 1].netProfit).toBeGreaterThanOrEqual(rank[i].netProfit);
});
