import { memoryDb } from '../helpers/memoryDb';
import { migrate } from '../../src/db/schema';
import { loadIndexes } from '../../src/invest/history';
import { fetchSeries } from '../../src/invest/sources/history';

const ok = (body: unknown) => (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
const rows = [{ data: '03/11/2026', valor: '0.054' }, { data: '04/11/2026', valor: '0.055' }];

test('fetchSeries converte datas e valores', async () => {
  expect(await fetchSeries(ok(rows), 12, '2026-11-01', '2026-11-05')).toEqual([['2026-11-03', 0.054], ['2026-11-04', 0.055]]);
});

test('fetchSeries devolve null com erro, resposta ruim ou valor inválido', async () => {
  expect(await fetchSeries((async () => { throw new Error('x'); }) as unknown as typeof fetch, 12, 'a', 'b')).toBeNull();
  expect(await fetchSeries((async () => ({ ok: false })) as unknown as typeof fetch, 12, 'a', 'b')).toBeNull();
  expect(await fetchSeries(ok([{ data: '03/11/2026', valor: 'x' }]), 12, 'a', 'b')).toBeNull();
});

test('loadIndexes usa o cache por 24 h e cai nele quando a rede falha', async () => {
  const db = await memoryDb();
  await migrate(db);
  let calls = 0;
  const f = (async () => { calls += 1; return { ok: true, json: async () => rows }; }) as unknown as typeof fetch;
  const now = new Date('2026-11-10T12:00:00Z');
  await loadIndexes(db, f, now, '2026-11-01', '2026-11-10');
  expect(calls).toBe(2);
  await loadIndexes(db, f, new Date('2026-11-10T20:00:00Z'), '2026-11-02', '2026-11-10');
  expect(calls).toBe(2);
  const down = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  const r = await loadIndexes(db, down, new Date('2026-11-20T12:00:00Z'), '2026-11-01', '2026-11-20');
  expect(r.cdi).toHaveLength(2); // vencido, mas melhor que nada
  const earlier = await loadIndexes(db, down, new Date('2026-11-20T12:00:00Z'), '2026-01-01', '2026-11-20');
  expect(earlier.cdi).toBeNull(); // cache não cobre o início pedido
});
