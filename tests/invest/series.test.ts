import { migrate } from '../../src/db/schema';
import { loadMany, loadSeries } from '../../src/invest/series';
import { fetchHistory } from '../../src/invest/sources/yahooHistory';
import { memoryDb } from '../helpers/memoryDb';

const NOW = new Date('2026-11-10T12:00:00Z');
const ts = (d: string) => Date.parse(d) / 1000;

function chart(adj: (number | null)[] | undefined, close: (number | null)[], currency = 'BRL') {
  return { chart: { result: [{
    meta: { currency, longName: 'Petrobras' },
    timestamp: [ts('2026-11-02'), ts('2026-11-03'), ts('2026-11-04')],
    indicators: { quote: [{ close }], ...(adj ? { adjclose: [{ adjclose: adj }] } : {}) },
  }] } };
}
const ok = (body: unknown) => (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch;

test('usa o fechamento ajustado e descarta pontos nulos', async () => {
  const s = await fetchHistory(ok(chart([10, null, 12], [11, 11, 13])), 'PETR4.SA');
  expect(s).toEqual({ symbol: 'PETR4.SA', name: 'Petrobras', currency: 'BRL', points: [['2026-11-02', 10], ['2026-11-04', 12]] });
});

test('sem ajuste cai no fechamento simples; resposta inválida dá null', async () => {
  expect((await fetchHistory(ok(chart(undefined, [11, 12, 13])), 'X'))!.points).toHaveLength(3);
  expect(await fetchHistory(ok({ chart: { result: [] } }), 'X')).toBeNull();
  expect(await fetchHistory((async () => { throw new Error('rede'); }) as never, 'X')).toBeNull();
});

async function db() {
  const d = await memoryDb();
  await migrate(d);
  return d;
}

test('cache fresco não vai à rede; vencido busca de novo; sem rede usa o velho', async () => {
  const d = await db();
  const spy = jest.fn(ok(chart([10, 11, 12], [10, 11, 12])));
  await loadSeries(d, spy, NOW, 'PETR4.SA');
  await loadSeries(d, spy, new Date(NOW.getTime() + 3_600_000), 'PETR4.SA');
  expect(spy).toHaveBeenCalledTimes(1);
  await loadSeries(d, spy, new Date(NOW.getTime() + 25 * 3_600_000), 'PETR4.SA');
  expect(spy).toHaveBeenCalledTimes(2);

  const offline = (async () => { throw new Error('rede'); }) as never;
  const old = await loadSeries(d, offline, new Date(NOW.getTime() + 60 * 3_600_000), 'PETR4.SA');
  expect(old!.stale).toBe(true);
  expect(old!.points).toHaveLength(3);
  expect(await loadSeries(d, offline, NOW, 'NUNCA')).toBeNull();
});

test('loadMany deixa de fora só os que falham', async () => {
  const d = await db();
  const f = (async (url: string) => {
    if (url.includes('RUIM')) throw new Error('rede');
    return { ok: true, status: 200, json: async () => chart([1, 2, 3], [1, 2, 3]) };
  }) as unknown as typeof fetch;
  const out = await loadMany(d, f, NOW, ['A', 'RUIM', 'B', 'A']);
  expect(Object.keys(out).sort()).toEqual(['A', 'B']);
});
