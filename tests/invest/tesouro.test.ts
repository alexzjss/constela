import { fetchTesouro } from '../../src/invest/sources/tesouro';

const NOW = new Date('2026-11-09T12:00:00Z');
const H = 'Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha';
const csv = [
  H,
  'Tesouro Selic;01/03/2027;06/11/2026;0,02;0,03;1;1;1',
  'Tesouro Selic;01/03/2031;06/11/2026;0,11;0,12;1;1;1',
  'Tesouro Prefixado;01/01/2027;06/11/2026;13,10;13,2;1;1;1',
  'Tesouro Prefixado;01/01/2028;06/11/2026;13,40;13,5;1;1;1',
  'Tesouro Prefixado;01/01/2033;06/11/2026;13,90;14,0;1;1;1',
  'Tesouro Prefixado com Juros Semestrais;01/01/2037;06/11/2026;99,99;99,99;1;1;1',
  'Tesouro IPCA+;15/08/2030;06/11/2026;7,50;7,6;1;1;1',
  'Tesouro IPCA+;15/05/2035;06/11/2026;7,80;7,9;1;1;1',
  'Tesouro Prefixado;01/01/2027;05/11/2026;1,00;1,0;1;1;1',
].join('\n');

const ok = (body: string) => (async () => ({ ok: true, status: 200, text: async () => body } as Response)) as unknown as typeof fetch;
const get = (es: { key: string; value: number }[], k: string) => es.find((e) => e.key === k);

test('usa a data base mais recente e o vencimento mais próximo do prazo', async () => {
  const es = await fetchTesouro(ok(csv), NOW);
  // data base 06/11/2026: 6 meses ≈ mai/2027 (01/2027 é o mais próximo); 12 e 24 meses ficam mais perto de 01/2028
  expect(get(es, 'tesouro.pre.6')!.value).toBeCloseTo(0.131, 6);
  expect(get(es, 'tesouro.pre.12')!.value).toBeCloseTo(0.134, 6);
  expect(get(es, 'tesouro.pre.24')!.value).toBeCloseTo(0.134, 6);
  expect(es.find((e) => e.key === 'tesouro.pre.12')!.asOf).toBe('2026-11-06');
});

test('Selic usa o spread (taxa ÷ 100) do vencimento mais próximo de 12 meses', async () => {
  const es = await fetchTesouro(ok(csv), NOW);
  expect(get(es, 'tesouro.selicSpread')!.value).toBeCloseTo(0.0002, 8);
});

test('ignora juros semestrais e cobre IPCA+', async () => {
  const es = await fetchTesouro(ok(csv), NOW);
  expect(es.some((e) => Math.abs(e.value - 0.9999) < 1e-9)).toBe(false);
  expect(get(es, 'tesouro.ipca.6')!.value).toBeCloseTo(0.075, 6);
});

test('título ausente omite as chaves; resposta não-ok devolve []', async () => {
  const only = [H, 'Tesouro Selic;01/03/2027;06/11/2026;0,02;0,03;1;1;1'].join('\n');
  const es = await fetchTesouro(ok(only), NOW);
  expect(es.map((e) => e.key)).toEqual(['tesouro.selicSpread']);
  const bad = (async () => ({ ok: false, status: 500, text: async () => '' } as Response)) as unknown as typeof fetch;
  expect(await fetchTesouro(bad, NOW)).toEqual([]);
});
