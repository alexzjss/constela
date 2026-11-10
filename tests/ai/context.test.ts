import { assetContext } from '../../src/ai/context';
import type { Analysis } from '../../src/features/research/analysis';

const a: Analysis = {
  symbol: 'PETR4.SA', name: 'Petrobras', currency: 'BRL', weeks: 150, change12m: 0.123, vsCdi12m: -0.02,
  volatility: 0.31, maxDrawdown: -0.42,
  indicators: [{ label: 'Ibovespa', symbol: '^BVSP', correlation: 0.81, beta: 1.2, obs: 150 }],
  similar: [{ id: 'VALE3.SA', name: 'Vale', correlation: 0.7, obs: 150 }], diversifiers: [],
  impact: { correlation: 0.55, volBefore: 0.2, volAfter: 0.22, volChange: 0.02, obs: 150, addWeight: 0.1 },
  insights: [], warnings: [],
};

test('contexto do ativo traz os números calculados e nada além', () => {
  const t = assetContext(a);
  expect(t).toContain('Petrobras (PETR4.SA');
  expect(t).toContain('+12,3%');
  expect(t).toContain('Ibovespa: correlação 0,81, beta 1,20');
  expect(t).toContain('20,0% → 22,0%');
  expect(t).toContain('Vale (0,70)');
  expect(t).not.toContain('Mais diversificadores');
});
