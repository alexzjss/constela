import { categorizeMerchant, normalizeKey } from '../../src/parser/merchants';
import { DEFAULT_CATEGORIES } from '../../src/domain/categories';

test('estabelecimentos conhecidos', () => {
  expect(categorizeMerchant('PADARIA MORADA', {})).toBe('comida');
  expect(categorizeMerchant('ACAITERIA CENTRAL', {})).toBe('comida');
  expect(categorizeMerchant('AUTOPASS S.A*ATM TMOB', {})).toBe('transporte');
  expect(categorizeMerchant('USP ESCOLA DAS ARTES', {})).toBe('educacao');
  expect(categorizeMerchant('MP *DESCONHECIDO', {})).toBe('outros');
});

test('regra do usuário vence a padrão', () => {
  const rules = { [normalizeKey('PADARIA MORADA')]: 'lazer' };
  expect(categorizeMerchant('PADARIA MORADA', rules)).toBe('lazer');
});

test('normalizeKey', () => {
  expect(normalizeKey('MP *Açaí  Central 12')).toBe('acai central');
  expect(normalizeKey('PERTO S A PE*PERTO S A')).toBe('perto s a perto s a');
});

test('categorias padrão têm ids únicos e cobrem os kinds', () => {
  const ids = DEFAULT_CATEGORIES.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toEqual(expect.arrayContaining(['comida', 'cartao', 'renda', 'reembolso', 'reserva', 'outros']));
  expect(DEFAULT_CATEGORIES.find((c) => c.id === 'reserva')?.kind).toBe('internal');
});
