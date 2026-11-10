import { iofRate, irRate, termDays } from '../../../src/engine/invest/tax';

test('IR regressivo', () => {
  expect(irRate(180)).toBe(0.225);
  expect(irRate(181)).toBe(0.2);
  expect(irRate(360)).toBe(0.2);
  expect(irRate(361)).toBe(0.175);
  expect(irRate(720)).toBe(0.175);
  expect(irRate(721)).toBe(0.15);
});

test('IOF regressivo', () => {
  expect(iofRate(1)).toBe(0.96);
  expect(iofRate(15)).toBe(0.5);
  expect(iofRate(29)).toBe(0.03);
  expect(iofRate(30)).toBe(0);
  expect(iofRate(400)).toBe(0);
});

test('dias do prazo', () => {
  expect(termDays(6)).toBe(183);
  expect(termDays(12)).toBe(365);
  expect(termDays(24)).toBe(730);
});
