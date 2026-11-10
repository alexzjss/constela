import { classOf, searchSymbols } from '../../src/invest/sources/yahooSearch';

const json = (body: unknown, ok = true) => (async () => ({ ok, status: ok ? 200 : 500, json: async () => body })) as unknown as typeof fetch;

test('classOf separa FII, ação, ETF no exterior e cripto', () => {
  expect(classOf('KNRI11.SA', 'EQUITY')).toBe('fii');
  expect(classOf('PETR4.SA', 'EQUITY')).toBe('acoesBr');
  expect(classOf('BOVA11.SA', 'ETF')).toBe('acoesBr');
  expect(classOf('IVVB11.SA', 'ETF')).toBe('exterior');
  expect(classOf('HASH11.SA', 'ETF')).toBe('cripto');
  expect(classOf('AAPL', 'EQUITY')).toBe('exterior');
  expect(classOf('BTC-USD', 'CRYPTOCURRENCY')).toBe('cripto');
});

test('busca mapeia nome, bolsa e classe e ignora tipos não suportados', async () => {
  const f = json({ quotes: [
    { symbol: 'PETR4.SA', shortname: 'PETROBRAS PN', longname: 'Petróleo Brasileiro S.A.', quoteType: 'EQUITY', exchDisp: 'São Paulo' },
    { symbol: 'PETR4.SA240119C00030000', quoteType: 'OPTION' },
    { symbol: 'VOO', shortname: 'Vanguard S&P 500', quoteType: 'ETF', exchDisp: 'NYSE Arca' },
    { quoteType: 'EQUITY' },
  ] });
  const hits = await searchSymbols(f, 'petr');
  expect(hits).toEqual([
    { symbol: 'PETR4.SA', name: 'Petróleo Brasileiro S.A.', kind: 'EQUITY', exchange: 'São Paulo', cls: 'acoesBr' },
    { symbol: 'VOO', name: 'Vanguard S&P 500', kind: 'ETF', exchange: 'NYSE Arca', cls: 'exterior' },
  ]);
});

test('texto curto não consulta; falha da fonte devolve lista vazia', async () => {
  const spy = jest.fn();
  expect(await searchSymbols(spy as never, 'a')).toEqual([]);
  expect(spy).not.toHaveBeenCalled();
  expect(await searchSymbols(json({}, false), 'petr')).toEqual([]);
  expect(await searchSymbols((async () => { throw new Error('rede'); }) as never, 'petr')).toEqual([]);
});
