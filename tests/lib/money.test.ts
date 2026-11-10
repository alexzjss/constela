import { parseBRL, formatBRL } from '../../src/lib/money';

test('parseBRL converte texto em centavos', () => {
  expect(parseBRL('35')).toBe(3500);
  expect(parseBRL('35,90')).toBe(3590);
  expect(parseBRL('R$ 1.200,50')).toBe(120050);
  expect(parseBRL('-16.80')).toBe(-1680);
  expect(parseBRL('1.200')).toBe(120000);
  expect(parseBRL('abc')).toBeNull();
});

test('formatBRL formata centavos', () => {
  expect(formatBRL(41200)).toBe('R$ 412');
  expect(formatBRL(3590, { cents: true })).toBe('R$ 35,90');
  expect(formatBRL(160000)).toBe('R$ 1.600');
});
