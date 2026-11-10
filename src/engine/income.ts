import type { IncomeSource, IncomeType, Transaction } from '../domain/types';
import { daysInMonth, monthOf, nextMonth } from '../lib/dates';
import type { Cents } from '../lib/money';

export const INCOME_TYPES: { id: IncomeType; label: string }[] = [
  { id: 'salario', label: 'Salário' },
  { id: 'bolsa', label: 'Bolsa' },
  { id: 'rendimento', label: 'Rendimentos' },
  { id: 'freelance', label: 'Freela' },
  { id: 'beneficio', label: 'Benefício' },
  { id: 'renda', label: 'Outros' },
];

export const incomeTypeLabel = (t: IncomeType): string =>
  INCOME_TYPES.find((x) => x.id === t)?.label ?? 'Outros';

/** Dia de recebimento no mês; meses curtos usam o último dia. */
export function payDate(month: string, day: number): string {
  const d = Math.min(Math.max(1, day), daysInMonth(month));
  return `${month}-${String(d).padStart(2, '0')}`;
}

export const inRange = (s: IncomeSource, month: string): boolean =>
  s.active && s.startMonth <= month && (s.endMonth === null || month <= s.endMonth);

export interface DueRun {
  sourceId: string;
  month: string;
  date: string;
}

/** Meses em que a fonte já deveria ter caído (data <= hoje) e ainda não foram lançados. */
export function dueRuns(sources: IncomeSource[], done: Set<string>, today: string): DueRun[] {
  const last = monthOf(today);
  const out: DueRun[] = [];
  for (const s of sources) {
    if (!s.active) continue;
    for (let m = s.startMonth; m <= last; m = nextMonth(m)) {
      if (s.endMonth !== null && m > s.endMonth) break;
      const date = payDate(m, s.day);
      if (date > today || done.has(`${s.id}|${m}`)) continue;
      out.push({ sourceId: s.id, month: m, date });
    }
  }
  return out;
}

/** O que as fontes ativas somam num mês: serve de renda esperada quando não há valor digitado. */
export function expectedFromSources(sources: IncomeSource[], month: string): Cents {
  return sources.filter((s) => inRange(s, month)).reduce((a, s) => a + s.amount, 0);
}

export interface IncomeBreakdown {
  total: Cents;
  byType: { categoryId: string; amount: Cents }[];
}

/** Ganhos do mês por categoria, do maior para o menor. */
export function incomeBreakdown(txs: Transaction[], month: string): IncomeBreakdown {
  const totals = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (t.kind !== 'income' || monthOf(t.date) !== month) continue;
    total += t.amount;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  const byType = [...totals.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { total, byType };
}
