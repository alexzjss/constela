import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';
import { buildInvestView, explainFor, type ViewInput } from '../../../src/features/invest/view';
import type { MarketSnapshot } from '../../../src/invest/refresh';
import { tx } from '../../helpers/tx';

const settings = { profile: 'moderado' as const, term: 12 as const, amountOverride: null, hyp: DEFAULT_HYPOTHESES };
const q = (value: number, extra?: Record<string, number | null>) => ({
  value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false, extra,
});
const base: ViewInput = {
  settings, snapshot: {}, txs: [], bills: [], goals: [], reserve: 700000, incomeSetting: 500000, today: '2026-11-09',
};

test('snapshot vazio não lança e marca noData', () => {
  const v = buildInvestView(base);
  expect(v.noData).toBe(true);
  expect(v.recommendation.ranking).toEqual([]);
  expect(v.assets).toHaveLength(13);
  expect(v.assets.every((a) => a.priceBrl === null)).toBe(true);
  expect(v.asOf).toBeNull();
});

test('valor digitado vira o amount', () => {
  const v = buildInvestView({ ...base, settings: { ...settings, amountOverride: 50000 } });
  expect(v.amount).toBe(50000);
  expect(v.defaultAmount).toBe(500000);
});

test('sem sobra: valor padrão 0 e aviso sem-valor', () => {
  const v = buildInvestView({ ...base, incomeSetting: 100000, txs: [tx('2026-11-03', 200000, 'expense', 'lazer')] });
  expect(v.defaultAmount).toBe(0);
  expect(v.recommendation.plan.warnings).toContain('sem-valor');
});

test('ativo em dólar é convertido; sem câmbio fica null', () => {
  const snap: MarketSnapshot = { 'asset:VOO': q(100, { change12m: 0.1, dividendYield: 0.01 }), 'fx.usdbrl': q(5) };
  const v = buildInvestView({ ...base, snapshot: snap });
  const voo = v.assets.find((a) => a.symbol === 'VOO')!;
  expect(voo.priceBrl).toBe(50000);
  expect(voo.dividendYield).toBe(0.01);
  const v2 = buildInvestView({ ...base, snapshot: { 'asset:VOO': q(100) } });
  expect(v2.assets.find((a) => a.symbol === 'VOO')!.priceBrl).toBeNull();
});

test('com taxas, noData é false e explainFor devolve as linhas', () => {
  const v = buildInvestView({ ...base, snapshot: { 'bcb.cdi': q(0.15), 'bcb.selic': q(0.15), 'bcb.tr': q(0) } });
  expect(v.noData).toBe(false);
  const e = explainFor(v, 'fixed:cdb')!;
  expect(e.title).toBe('CDB');
  expect(e.lines.length).toBeGreaterThan(0);
  expect(explainFor(v, 'inexistente')).toBeNull();
  expect(explainFor(v, 'plan')).not.toBeNull();
});

test('ver a conta da renda fixa mostra fonte e data do dado', () => {
  const snap = { 'bcb.cdi': q(0.15), 'bcb.selic': q(0.15), 'bcb.tr': q(0), 'tesouro.pre.12': q(0.13) };
  const v = buildInvestView({ ...base, snapshot: snap });
  const cdb = explainFor(v, 'fixed:cdb')!.lines.find((l) => l.label === 'Fonte e data')!;
  expect(cdb.value).toContain('Banco Central');
  expect(cdb.value).toContain('06/11/2026');
  const pre = explainFor(v, 'fixed:tesouroPre')!.lines.find((l) => l.label === 'Fonte e data')!;
  expect(pre.value).toContain('Tesouro Transparente');
  const hip = explainFor(v, 'fixed:tesouroPre')!.lines.find((l) => l.label === 'Hipótese do Tesouro')!;
  expect(hip.value).toContain('até o prazo');
});

test('valor padrão separa o gasto que ainda deve acontecer no mês', () => {
  // renda 5.000; nos 3 meses anteriores gastou 3.000 por mês; hoje (dia 9) gastou só 500
  const hist = ['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-10`, 300000, 'expense', 'lazer'));
  const v = buildInvestView({ ...base, txs: [...hist, tx('2026-11-03', 50000, 'expense', 'lazer')] });
  expect(v.defaultAmount).toBe(200000); // 5.000 - max(3.000, 500)
});

test('sem valor, a lista é só uma simulação de referência', () => {
  const none = buildInvestView({ ...base, incomeSetting: 100000, txs: [tx('2026-11-03', 200000, 'expense', 'lazer')] });
  expect(none.isReference).toBe(true);
  expect(buildInvestView(base).isReference).toBe(false);
});
