import type { Bill, Transaction } from '../domain/types';
import { dayOf, daysInMonth, monthOf, prevMonth } from '../lib/dates';
import type { Cents } from '../lib/money';

export interface CanSpend {
  available: Cents; // pode ser negativo
  daysLeft: number;
  amount: Cents; // por dia, nunca negativo
}

/**
 * Pode gastar hoje = (renda esperada − gasto do mês − contas fixas por vencer) / dias restantes.
 * Conta "por vencer" = dueDay >= dia de hoje (pagar antes ainda conta como pendente).
 */
export function canSpendToday(input: {
  today: string;
  expectedIncome: Cents;
  bills: Bill[];
  txs: Transaction[];
}): CanSpend | null {
  const { today, expectedIncome, bills, txs } = input;
  if (expectedIncome <= 0) return null;
  const month = monthOf(today);
  const spent = txs
    .filter((t) => t.kind === 'expense' && monthOf(t.date) === month)
    .reduce((a, t) => a + t.amount, 0);
  const pending = bills.filter((b) => b.dueDay >= dayOf(today)).reduce((a, b) => a + b.amount, 0);
  const available = expectedIncome - spent - pending;
  const daysLeft = daysInMonth(month) - dayOf(today) + 1;
  return { available, daysLeft, amount: Math.max(0, Math.floor(available / daysLeft)) };
}

/** Renda digitada pelo usuário; senão, a mediana da renda dos 3 meses anteriores; senão 0. */
export function expectedMonthlyIncome(txs: Transaction[], today: string, setting: Cents | null): Cents {
  if (setting && setting > 0) return setting;
  const totals: number[] = [];
  let m = monthOf(today);
  for (let i = 0; i < 3; i++) {
    m = prevMonth(m);
    const sum = txs.filter((t) => t.kind === 'income' && monthOf(t.date) === m).reduce((a, t) => a + t.amount, 0);
    if (sum > 0) totals.push(sum);
  }
  if (totals.length === 0) return 0;
  totals.sort((a, b) => a - b);
  const mid = Math.floor(totals.length / 2);
  return totals.length % 2 ? totals[mid] : Math.round((totals[mid - 1] + totals[mid]) / 2);
}
