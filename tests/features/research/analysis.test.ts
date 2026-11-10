import type { PricePoint } from '../../../src/engine/correlation';
import { analyze, inBrl, portfolioRisk, suggestDiversifiers, type AssetSeries } from '../../../src/features/research/analysis';
import { addToWatchlist, loadWatchlist, removeFromWatchlist } from '../../../src/features/research/watchlist';
import { migrate } from '../../../src/db/schema';
import { memoryDb } from '../../helpers/memoryDb';

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5) / 10;
}
const noise = (n: number, seed: number) => Array.from({ length: n }, lcg(seed));
function series(symbol: string, rets: number[], currency = 'BRL'): AssetSeries {
  let p = 100;
  const points: PricePoint[] = [['2024-01-01', p]];
  rets.forEach((r, i) => { p *= 1 + r; points.push([addDays('2024-01-01', 7 * (i + 1)), p]); });
  return { symbol, name: `Nome ${symbol}`, currency, points };
}
const N = 80;
const A = noise(N, 1);
const flatFx: PricePoint[] = [['2023-12-01', 5], ['2025-12-01', 5]];

test('inBrl converte dólar, deixa real e recusa moeda sem câmbio', () => {
  expect(inBrl({ currency: 'BRL', points: [['2024-01-01', 2]] }, null)).toEqual([['2024-01-01', 2]]);
  expect(inBrl({ currency: 'USD', points: [['2024-01-02', 2]] }, flatFx)).toEqual([['2024-01-02', 10]]);
  expect(inBrl({ currency: 'USD', points: [['2024-01-02', 2]] }, null)).toBeNull();
  expect(inBrl({ currency: 'EUR', points: [['2024-01-02', 2]] }, flatFx)).toBeNull();
});

test('ativo em dólar com câmbio constante tem a mesma correlação que em reais', () => {
  const a = series('A', A);
  const usd = series('AU', A, 'USD');
  const r = analyze({ target: usd, fx: flatFx, references: [{ symbol: 'A', label: 'A', points: a.points, currency: 'BRL' }], universe: [], held: [] });
  expect(r.indicators[0].correlation).toBeCloseTo(1, 8);
  expect(r.indicators[0].beta).toBeCloseTo(1, 8);
});

test('sem câmbio, o ativo em dólar avisa e não correlaciona', () => {
  const r = analyze({ target: series('AU', A, 'USD'), fx: null, references: [{ symbol: 'A', label: 'A', points: series('A', A).points, currency: 'BRL' }], universe: [], held: [] });
  expect(r.warnings[0]).toContain('Sem câmbio');
  expect(r.indicators[0].correlation).toBeNull();
});

test('análise junta parecidos, diversificadores e impacto na carteira', () => {
  const target = series('T', A);
  const twin = series('GEMEO', A.map((x) => x * 1.2));
  const mirror = series('ESPELHO', A.map((x) => -x));
  const r = analyze({
    target, fx: null, references: [], universe: [twin, mirror, target],
    held: [{ series: twin, value: 100000 }],
  });
  expect(r.similar[0]).toMatchObject({ id: 'GEMEO', name: 'Nome GEMEO' });
  expect(r.diversifiers[0].id).toBe('ESPELHO');
  expect(r.similar.map((s) => s.id)).not.toContain('T');
  expect(r.impact!.correlation).toBeCloseTo(1, 6);
  expect(r.insights.join(' ')).toContain('concentra risco');
  expect(r.insights.join(' ')).toContain('10% da carteira');
});

test('ativo que se opõe à carteira aparece como diversificador', () => {
  const r = analyze({
    target: series('T', A.map((x) => -x)), fx: null, references: [], universe: [],
    held: [{ series: series('H', A), value: 100000 }],
  });
  expect(r.impact!.volChange!).toBeLessThan(0);
  expect(r.insights.join(' ')).toContain('diversificar');
  expect(r.insights.join(' ')).toContain('reduziria');
});

test('pouco histórico avisa que o número é frágil', () => {
  const r = analyze({ target: series('T', A.slice(0, 10)), fx: null, references: [], universe: [], held: [] });
  expect(r.insights[0]).toContain('pouco confiáveis');
});

test('suggestDiversifiers ordena por quem mais reduz o risco e ignora o que já tem', () => {
  const h = series('H', A);
  const out = suggestDiversifiers(
    [{ series: h, value: 1 }],
    [h, series('ESPELHO', A.map((x) => -x)), series('CLONE', A), series('RUIDO', noise(N, 9))],
    null,
  );
  expect(out.map((s) => s.symbol)).toEqual(['ESPELHO', 'RUIDO', 'CLONE']);
  expect(suggestDiversifiers([], [h], null)).toEqual([]);
});

test('lista de acompanhamento: adiciona sem duplicar, remove e sobrevive a lixo', async () => {
  const d = await memoryDb();
  await migrate(d);
  expect(await loadWatchlist(d)).toEqual([]);
  const item = { symbol: 'PETR4.SA', name: 'Petrobras', cls: 'acoesBr' as const };
  await addToWatchlist(d, item);
  expect(await addToWatchlist(d, item)).toHaveLength(1);
  expect(await removeFromWatchlist(d, 'PETR4.SA')).toEqual([]);
  await d.run(`UPDATE meta SET value = 'não é json' WHERE key = 'watchlist'`);
  expect(await loadWatchlist(d)).toEqual([]);
});

test('risco da carteira: cobertura, volatilidade e o par mais parecido', () => {
  const a = series('A', A);
  const b = series('B', A.map((x) => x * 0.9));
  const c = series('C', noise(N, 9));
  const r = portfolioRisk([{ series: a, value: 100 }, { series: b, value: 100 }, { series: c, value: 100 }], null, 400);
  expect(r.coverage).toBeCloseTo(0.75, 10);
  expect(r.volatility).toBeGreaterThan(0);
  expect(r.pairs[0]).toMatchObject({ a: 'A', b: 'B' });
  expect(r.pairs[0].correlation).toBeCloseTo(1, 6);
  expect(portfolioRisk([], null, 0)).toMatchObject({ volatility: null, coverage: 0, pairs: [] });
});
