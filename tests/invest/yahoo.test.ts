import { fetchYahoo } from '../../src/invest/sources/yahoo';

const NOW = new Date('2026-11-09T12:00:00Z');

function chart(price: unknown, closes: (number | null)[], dividends?: Record<string, { amount: number }>) {
  return {
    chart: {
      result: [{
        meta: { regularMarketPrice: price, regularMarketTime: 1794259130 },
        indicators: { quote: [{ close: closes }] },
        ...(dividends ? { events: { dividends } } : {}),
      }],
    },
  };
}

function fakeFetch(map: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const sym = decodeURIComponent(/chart\/([^?]+)\?/.exec(url)![1]);
    if (!(sym in map)) throw new Error('rede');
    return { ok: true, status: 200, json: async () => map[sym] } as Response;
  }) as unknown as typeof fetch;
}

const find = (es: { key: string }[], k: string) => es.find((e) => e.key === k) as
  | { key: string; value: number; asOf: string; extra?: Record<string, number | null> }
  | undefined;

test('preço, variação 12m e dividend yield', async () => {
  const f = fakeFetch({
    'KNRI11.SA': chart(100, [null, 80, 90, 100], { a: { amount: 2 }, b: { amount: 3 } }),
    'USDBRL=X': chart(5.4, [5, 5.4]),
  });
  const es = await fetchYahoo(f, NOW, ['KNRI11.SA']);
  const k = find(es, 'asset:KNRI11.SA')!;
  expect(k.value).toBe(100);
  expect(k.extra!.change12m).toBeCloseTo(0.25, 8);
  expect(k.extra!.dividendYield).toBeCloseTo(0.05, 8);
  expect(k.asOf).toBe('2026-11-09');
  expect(find(es, 'fx.usdbrl')!.value).toBe(5.4);
});

test('sem dividendos o yield é null', async () => {
  const es = await fetchYahoo(fakeFetch({ 'BTC-USD': chart(60000, [30000, 60000]), 'USDBRL=X': chart(5, [5]) }), NOW, ['BTC-USD']);
  expect(find(es, 'asset:BTC-USD')!.extra!.dividendYield).toBeNull();
});

test('preço zero ou inválido omite só aquele símbolo', async () => {
  const f = fakeFetch({ 'A.SA': chart(0, [1, 2]), 'B.SA': chart('x', [1, 2]), 'C.SA': chart(10, [10, 11]), 'USDBRL=X': chart(5, [5]) });
  const es = await fetchYahoo(f, NOW, ['A.SA', 'B.SA', 'C.SA']);
  expect(es.map((e) => e.key).sort()).toEqual(['asset:C.SA', 'fx.usdbrl']);
});

test('símbolo que rejeita não impede os outros', async () => {
  const es = await fetchYahoo(fakeFetch({ 'OK.SA': chart(10, [10, 12]) }), NOW, ['FALHA.SA', 'OK.SA']);
  expect(es.map((e) => e.key)).toEqual(['asset:OK.SA']);
});
