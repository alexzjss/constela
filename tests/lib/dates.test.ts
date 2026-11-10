import {
  todayLocal, fromBR, addDays, monthOf, prevMonth, daysInMonth, dayOf, monthNamePt,
} from '../../src/lib/dates';

test('todayLocal usa o fuso do aparelho, também às 00:30 do dia 1º', () => {
  expect(todayLocal(new Date(2026, 10, 1, 0, 30))).toBe('2026-11-01');
});

test('conversões de data', () => {
  expect(fromBR('02/10/2026')).toBe('2026-10-02');
  expect(monthOf('2026-10-02')).toBe('2026-10');
  expect(dayOf('2026-10-02')).toBe(2);
  expect(prevMonth('2026-01')).toBe('2025-12');
  expect(daysInMonth('2026-02')).toBe(28);
  expect(daysInMonth('2028-02')).toBe(29);
  expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  expect(monthNamePt('2026-10')).toBe('outubro');
});

import { daysBetween } from '../../src/lib/dates';

test('daysBetween conta dias entre datas locais', () => {
  expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14);
  expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  expect(daysBetween('2026-11-15', '2026-11-01')).toBe(-14);
});
