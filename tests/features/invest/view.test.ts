import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';
import { buildInvestView, explainFor, type ViewInput } from '../../../src/features/invest/view';

const settings = { profile: 'moderado' as const, term: 12 as const, amountOverride: null, hyp: DEFAULT_HYPOTHESES };
const q = (value: number, extra?: Record<string, number | null>) => ({
  value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false, extra,
});
const base: ViewInput = { settings, snapshot: {} };

test('snapshot vazio não lança e marca noData', () => {
  const v = buildInvestView(base);
  expect(v.noData).toBe(true);
  expect(v.recommendation.ranking).toEqual([]);
  expect(v.asOf).toBeNull();
});

test('valor digitado vira o amount', () => {
  const v = buildInvestView({ ...base, settings: { ...settings, amountOverride: 50000 } });
  expect(v.amount).toBe(50000);
});

test('sem valor digitado, o amount é 0 e o plano avisa', () => {
  const v = buildInvestView(base);
  expect(v.amount).toBe(0);
  expect(v.recommendation.plan.warnings).toContain('sem-valor');
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

test('sem valor, a lista é só uma simulação de referência', () => {
  expect(buildInvestView(base).isReference).toBe(true);
  expect(buildInvestView({ ...base, settings: { ...settings, amountOverride: 100000 } }).isReference).toBe(false);
});

test('carteira cadastrada entra no view e desvia o mix para o que falta', () => {
  const holdings = [{ id: 'h', type: 'tesouro' as const, name: 'Selic', invested: 900000, value: 900000, updatedAt: '2026-11-01' }];
  const withValue = { ...base, settings: { ...settings, amountOverride: 100000 } };
  const none = buildInvestView(withValue);
  const withH = buildInvestView({ ...withValue, holdings });
  expect(none.portfolio).toBeNull();
  expect(withH.portfolio?.total).toBe(900000);
  const mix = (v: typeof none) => v.recommendation.classes.find((c) => c.cls === 'rendaFixa')!.amount;
  expect(mix(withH)).toBeLessThan(mix(none));
  expect(explainFor(withH, 'plan')!.lines.map((l) => l.label)).toContain('Mix ajustado à sua carteira');
});
