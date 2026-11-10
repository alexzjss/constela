import { fetchBcb } from '../../src/invest/sources/bcb';

type Series = Record<string, unknown>;
const NOW = new Date('2026-11-09T12:00:00Z');

function fakeFetch(series: Series, failCodes: string[] = []): typeof fetch {
  return (async (url: string) => {
    const code = /sgs\.(\d+)\//.exec(url)![1];
    if (failCodes.includes(code)) throw new Error('rede');
    const body = series[code];
    if (body === undefined) return { ok: false, status: 404, json: async () => [] } as Response;
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

const ipca12 = Array.from({ length: 12 }, (_, i) => ({ data: `01/${String(i + 1).padStart(2, '0')}/2026`, valor: '0.5' }));
const all: Series = {
  '432': [{ data: '06/11/2026', valor: '14.90' }],
  '4389': [{ data: '06/11/2026', valor: '14.80' }],
  '433': ipca12,
  '226': [{ data: '06/11/2026', valor: '0.1' }],
};

const byKey = (es: { key: string; value: number }[], k: string) => es.find((e) => e.key === k);

test('converte Selic, CDI, IPCA 12m e TR', async () => {
  const es = await fetchBcb(fakeFetch(all), NOW);
  expect(byKey(es, 'bcb.selic')).toMatchObject({ value: 0.149, asOf: '2026-11-06', fetchedAt: NOW.toISOString() });
  expect(byKey(es, 'bcb.cdi')!.value).toBeCloseTo(0.148, 6);
  expect(byKey(es, 'bcb.ipca12m')!.value).toBeCloseTo(0.0616778, 6);
  expect(byKey(es, 'bcb.tr')!.value).toBeCloseTo(1.001 ** 12 - 1, 8);
});

test('IPCA com menos de 12 valores é omitido', async () => {
  const es = await fetchBcb(fakeFetch({ ...all, '433': ipca12.slice(0, 11) }), NOW);
  expect(byKey(es, 'bcb.ipca12m')).toBeUndefined();
  expect(byKey(es, 'bcb.selic')).toBeDefined();
});

test('valor não numérico é omitido', async () => {
  const es = await fetchBcb(fakeFetch({ ...all, '432': [{ data: '06/11/2026', valor: 'abc' }] }), NOW);
  expect(byKey(es, 'bcb.selic')).toBeUndefined();
});

test('uma série que falha não derruba as outras', async () => {
  const es = await fetchBcb(fakeFetch(all, ['432']), NOW);
  expect(byKey(es, 'bcb.selic')).toBeUndefined();
  expect(es.map((e) => e.key).sort()).toEqual(['bcb.cdi', 'bcb.ipca12m', 'bcb.tr']);
});

test('array vazio e status não-ok são omitidos', async () => {
  const es = await fetchBcb(fakeFetch({ '432': [], '4389': all['4389'] }), NOW);
  expect(es.map((e) => e.key)).toEqual(['bcb.cdi']);
});
