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

test('ponto com 1 ou 2 casas é decimal, com 3 é milhar', () => {
  expect(parseBRL('12.5')).toBe(1250);
  expect(parseBRL('0.5')).toBe(50);
  expect(parseBRL('35.50')).toBe(3550);
  expect(parseBRL('1.200')).toBe(120000);
});
