import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MonthBar } from '../../../src/features/home/MonthBar';
import type { MonthSummary } from '../../../src/engine/month';

const base: MonthSummary = {
  month: '2026-11', income: 0, spent: 41200,
  byCategory: [{ categoryId: 'comida', amount: 18000 }], ghost: null,
};

test('mostra o total do mês', async () => {
  await render(<MonthBar summary={base} />);
  expect(screen.getByText('R$ 412')).toBeTruthy();
});

test('fantasma à frente', async () => {
  await render(<MonthBar summary={{ ...base, ghost: { month: '2026-10', spentSameDay: 46800, diff: 5600 } }} />);
  expect(screen.getByText('R$ 56 à frente de outubro')).toBeTruthy();
});

test('fantasma atrás', async () => {
  await render(<MonthBar summary={{ ...base, ghost: { month: '2026-10', spentSameDay: 36800, diff: -4400 } }} />);
  expect(screen.getByText('R$ 44 atrás de outubro')).toBeTruthy();
});

test('sem fantasma não mostra a linha', async () => {
  await render(<MonthBar summary={base} />);
  expect(screen.queryByText(/de outubro/)).toBeNull();
});
