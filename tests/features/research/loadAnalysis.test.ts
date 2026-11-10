import { addHolding } from '../../../src/db/holdings';
import { migrate } from '../../../src/db/schema';
import { analysisFor, diversifiersFor, loadContext } from '../../../src/features/research/loadAnalysis';
import { addToWatchlist } from '../../../src/features/research/watchlist';
import { memoryDb } from '../../helpers/memoryDb';

const NOW = new Date('2026-11-10T12:00:00Z');
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5) / 10;
}
function weekly(rets: number[], currency = 'BRL') {
  let p = 100;
  const start = Date.parse('2024-01-01');
  const ts: number[] = [start / 1000];
  const close: number[] = [p];
  rets.forEach((r, i) => { p *= 1 + r; ts.push((start + 7 * 86400000 * (i + 1)) / 1000); close.push(p); });
  return { chart: { result: [{ meta: { currency, longName: 'X' }, timestamp: ts, indicators: { quote: [{ close }] } }] } };
}
const gen = (seed: number) => Array.from({ length: 100 }, lcg(seed));
const A = gen(1);

function fakeFetch(bySymbol: Record<string, unknown>) {
  return (async (url: string) => {
    if (url.includes('bcb.gov.br')) return { ok: false, status: 500, json: async () => [] };
    const sym = decodeURIComponent(/chart\/([^?]+)\?/.exec(url)![1]);
    if (!(sym in bySymbol)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => bySymbol[sym] };
  }) as unknown as typeof fetch;
}

test('contexto junta carteira, acompanhados e referências; análise usa tudo', async () => {
  const d = await memoryDb();
  await migrate(d);
  await addHolding(d, { type: 'acoes', name: 'Minha ação', invested: 1, value: 100000, updatedAt: '2026-11-01', symbol: 'MINHA.SA' });
  await addToWatchlist(d, { symbol: 'ESPELHO.SA', name: 'Espelho', cls: 'acoesBr' });

  const ctx = await loadContext(d, fakeFetch({
    'MINHA.SA': weekly(A), 'ESPELHO.SA': weekly(A.map((x) => -x)), '^BVSP': weekly(A), '^GSPC': weekly(gen(5), 'USD'), 'USDBRL=X': weekly(gen(6)),
  }), NOW);

  expect(ctx.held).toHaveLength(1);
  expect(ctx.references.map((r) => r.label)).toEqual(['Ibovespa', 'S&P 500', 'Dólar']);
  expect(ctx.universe.map((u) => u.symbol).sort()).toEqual(['ESPELHO.SA', 'MINHA.SA']);
  expect(ctx.cdi12m).toBeNull(); // BCB fora do ar não derruba nada
  expect(ctx.stale).toBe(false);

  const a = analysisFor(ctx, 'ESPELHO.SA')!;
  expect(a.indicators.find((i) => i.label === 'Ibovespa')!.correlation).toBeCloseTo(-1, 6);
  expect(a.impact!.volChange!).toBeLessThan(0);
  expect(diversifiersFor(ctx).map((s) => s.symbol)).toEqual(['ESPELHO.SA']);
  expect(analysisFor(ctx, 'NAOEXISTE')).toBeNull();
});

test('sem rede e sem cache o contexto vem vazio, sem lançar', async () => {
  const d = await memoryDb();
  await migrate(d);
  const ctx = await loadContext(d, (async () => { throw new Error('rede'); }) as never, NOW);
  expect(ctx.universe).toEqual([]);
  expect(ctx.fx).toBeNull();
  expect(ctx.references).toEqual([]);
});
