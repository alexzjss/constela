import type { Transaction } from '../domain/types';
import { dayOf, daysInMonth, monthOf, prevMonth } from '../lib/dates';
import type { Cents } from '../lib/money';

export interface Alert {
  categoryId: string;
  current: Cents;
  usual: Cents;
}

const RATIO = 1.3;
const MIN_DIFF: Cents = 5000;

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

/** Maior gasto fora do padrão: acumulado do mês até hoje contra o usual até o mesmo dia. */
export function topAlert(txs: Transaction[], today: string): Alert | null {
  const expenses = txs.filter((t) => t.kind === 'expense' && t.categoryId !== 'cartao');
  const cumulative = (month: string, upTo: number) => {
    const by = new Map<string, number>();
    for (const t of expenses) {
      if (monthOf(t.date) === month && dayOf(t.date) <= upTo) by.set(t.categoryId, (by.get(t.categoryId) ?? 0) + t.amount);
    }
    return by;
  };

  const month = monthOf(today);
  const history: Map<string, number>[] = [];
  let m = month;
  for (let i = 0; i < 3; i++) {
    m = prevMonth(m);
    if (expenses.some((t) => monthOf(t.date) === m)) history.push(cumulative(m, Math.min(dayOf(today), daysInMonth(m))));
  }
  if (history.length < 2) return null;

  const current = cumulative(month, dayOf(today));
  let best: (Alert & { diff: number }) | null = null;
  for (const [categoryId, now] of current) {
    const usual = median(history.map((h) => h.get(categoryId) ?? 0));
    const diff = now - usual;
    if (usual > 0 && now > usual * RATIO && diff >= MIN_DIFF && (!best || diff > best.diff)) {
      best = { categoryId, current: now, usual, diff };
    }
  }
  return best ? { categoryId: best.categoryId, current: best.current, usual: best.usual } : null;
}
