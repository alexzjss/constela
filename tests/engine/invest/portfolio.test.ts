import type { Holding } from '../../../src/domain/types';
import { buildPortfolio, portfolioByClass } from '../../../src/engine/invest/portfolio';

const h = (type: Holding['type'], value: number): Holding => ({ id: type + value, type, name: type, invested: value, value, updatedAt: '2026-11-01' });

test('agrupa tipos em classes e ignora "outros"', () => {
  const c = portfolioByClass([h('tesouro', 100), h('cdb', 50), h('acoes', 30), h('outros', 999)]);
  expect(c).toMatchObject({ rendaFixa: 150, acoesBr: 30, fii: 0 });
});

test('sem carteira classificável, null', () => {
  expect(buildPortfolio([], 'moderado')).toBeNull();
  expect(buildPortfolio([h('outros', 500)], 'moderado')).toBeNull();
});

test('compara com a faixa do perfil', () => {
  const p = buildPortfolio([h('tesouro', 900), h('cripto', 100)], 'moderado')!;
  const row = (c: string) => p.rows.find((r) => r.cls === c)!;
  expect(row('rendaFixa')).toMatchObject({ status: 'acima' }); // 90% vs 55–65
  expect(row('cripto')).toMatchObject({ status: 'acima' }); // 10% vs 0–7
  expect(row('fii').status).toBe('abaixo'); // 0% vs 10–20
});
