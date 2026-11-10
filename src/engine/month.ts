import type { Transaction } from '../domain/types';
import { dayOf, daysInMonth, monthOf, prevMonth } from '../lib/dates';
import type { Cents } from '../lib/money';

export interface MonthSummary {
  month: string;
  income: Cents;
  spent: Cents;
  byCategory: { categoryId: string; amount: Cents }[];
  ghost: { month: string; spentSameDay: Cents; diff: Cents } | null;
}

const sum = (txs: Transaction[]) => txs.reduce((a, t) => a + t.amount, 0);

export function monthSummary(txs: Transaction[], month: string, today: string): MonthSummary {
  const inMonth = txs.filter((t) => monthOf(t.date) === month);
  const expenses = inMonth.filter((t) => t.kind === 'expense');
  const spent = sum(expenses);

  const totals = new Map<string, number>();
  for (const t of expenses) totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  const byCategory = [...totals.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);

  const prev = prevMonth(month);
  const prevTxs = txs.filter((t) => monthOf(t.date) === prev);
  let ghost: MonthSummary['ghost'] = null;
  if (prevTxs.length > 0) {
    const limit = month === monthOf(today)
      ? Math.min(dayOf(today), daysInMonth(prev))
      : daysInMonth(prev);
    const spentSameDay = sum(prevTxs.filter((t) => t.kind === 'expense' && dayOf(t.date) <= limit));
    ghost = { month: prev, spentSameDay, diff: spentSameDay - spent };
  }

  return {
    month,
    income: sum(inMonth.filter((t) => t.kind === 'income')),
    spent,
    byCategory,
    ghost,
  };
}
