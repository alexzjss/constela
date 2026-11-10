import { migrate } from '../../src/db/schema';
import { EMPTY_RATES } from '../../src/engine/invest/types';
import { getAllEntries, putEntries } from '../../src/invest/cache';
import { loadSnapshot, ratesFromSnapshot, refreshMarket, sourceOf } from '../../src/invest/refresh';
import { memoryDb } from '../helpers/memoryDb';

const NOW = new Date('2026-11-09T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

/** fetch falso: responde às três fontes por URL e conta as chamadas. */
function fakeFetch(opts: { failBcb?: boolean } = {}) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    if (url.includes('api.bcb.gov.br')) {
      if (opts.failBcb) throw new Error('rede');
      return { ok: true, status: 200, json: async () => [{ data: '06/11/2026', valor: '10.00' }] } as Response;
    }
    if (url.includes('tesourotransparente')) {
      const csv = 'h\nTesouro Selic;01/03/2027;06/11/2026;0,02;0;0;0;0';
      return { ok: true, status: 200, text: async () => csv } as Response;
    }
    return {
      ok: true, status: 200,
      json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 10, regularMarketTime: 1794259130 }, indicators: { quote: [{ close: [1, 2] }] } }] } }),
    } as Response;
  }) as unknown as typeof fetch;
  return { f, calls };
}

async function freshDb() {
  const db = await memoryDb();
  await migrate(db);
  return db;
}

test('sourceOf separa as fontes pelo prefixo da chave', () => {
  expect(sourceOf('bcb.selic')).toBe('bcb');
  expect(sourceOf('tesouro.pre.12')).toBe('tesouro');
  expect(sourceOf('asset:VOO')).toBe('yahoo');
  expect(sourceOf('fx.usdbrl')).toBe('yahoo');
});

test('primeira chamada grava; a segunda dentro do TTL usa o cache sem rede', async () => {
  const db = await freshDb();
  const a = fakeFetch();
  const r1 = await refreshMarket(db, a.f, NOW);
  expect(r1.sources).toEqual({ bcb: 'ok', tesouro: 'ok', yahoo: 'ok' });
  const b = fakeFetch();
  const r2 = await refreshMarket(db, b.f, NOW);
  expect(r2.sources).toEqual({ bcb: 'cached', tesouro: 'cached', yahoo: 'cached' });
  expect(b.calls).toHaveLength(0);
});

test('force busca de novo', async () => {
  const db = await freshDb();
  await refreshMarket(db, fakeFetch().f, NOW);
  const b = fakeFetch();
  const r = await refreshMarket(db, b.f, NOW, true);
  expect(r.sources.bcb).toBe('ok');
  expect(b.calls.length).toBeGreaterThan(0);
});

test('fonte que falha vira erro e preserva o cache antigo; as outras seguem', async () => {
  const db = await freshDb();
  await putEntries(db, [{ key: 'bcb.selic', value: 0.2, asOf: '2026-11-01', fetchedAt: hoursAgo(10) }]);
  const r = await refreshMarket(db, fakeFetch({ failBcb: true }).f, NOW);
  expect(r.sources.bcb).toBe('erro');
  expect(r.sources.tesouro).toBe('ok');
  const selic = (await getAllEntries(db)).find((e) => e.key === 'bcb.selic')!;
  expect(selic.value).toBe(0.2);
});

test('stale depende do TTL de cada fonte', async () => {
  const db = await freshDb();
  await putEntries(db, [
    { key: 'bcb.selic', value: 0.15, asOf: '2026-11-06', fetchedAt: hoursAgo(7) },
    { key: 'tesouro.pre.12', value: 0.13, asOf: '2026-11-06', fetchedAt: hoursAgo(7) },
  ]);
  const snap = await loadSnapshot(db, NOW);
  expect(snap['bcb.selic'].stale).toBe(true);
  expect(snap['tesouro.pre.12'].stale).toBe(false);
});

test('ratesFromSnapshot', () => {
  expect(ratesFromSnapshot({})).toEqual(EMPTY_RATES);
  const q = (value: number) => ({ value, asOf: '2026-11-06', fetchedAt: NOW.toISOString(), stale: false });
  const r = ratesFromSnapshot({ 'bcb.cdi': q(0.14), 'tesouro.pre.12': q(0.13) });
  expect(r.cdi).toBe(0.14);
  expect(r.tesouroPre[12]).toBe(0.13);
  expect(r.selic).toBeNull();
  expect(r.tesouroIpca[6]).toBeNull();
});
