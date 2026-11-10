import { categoryById } from '../domain/categories';
import type { Transaction } from '../domain/types';
import { addDays, dayOf, daysInMonth, monthOf, prevMonth } from '../lib/dates';

export interface ProvisionalScore {
  total: number; // 0..100
  folga: number; // 0..30
  constancia: number; // 0..20
  provisional: true;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Folga: sobra da renda nos últimos 30 dias. 0% -> 0 pontos, 30% ou mais -> 30. */
function folgaPoints(txs: Transaction[], today: string): number {
  const from = addDays(today, -29);
  const win = txs.filter((t) => t.date >= from && t.date <= today);
  const income = win.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0);
  const spent = win.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
  if (income <= 0 || spent >= income) return 0;
  if ((income - spent) * 100 >= income * 30) return 30;
  return round2((30 * (income - spent)) / (income * 0.3));
}

/** Registros: dias dos últimos 14 com algum lançamento (CSV cobre o dia). 0..10. */
function registrosPoints(txs: Transaction[], today: string): number {
  const days = new Set(txs.map((t) => t.date));
  // Um extrato importado cobre todos os dias entre o primeiro e o último lançamento dele.
  const csv = txs.filter((t) => t.source === 'csv').map((t) => t.date).sort();
  if (csv.length > 0) {
    for (let d = csv[0]; d <= csv[csv.length - 1]; d = addDays(d, 1)) days.add(d);
  }
  let covered = 0;
  for (let i = 0; i < 14; i++) if (days.has(addDays(today, -i))) covered += 1;
  return round2((covered / 14) * 10);
}

/** Estabilidade: gasto do mês projetado contra a mediana dos 3 meses anteriores. 0..10. */
function estabilidadePoints(txs: Transaction[], today: string): number {
  const month = monthOf(today);
  // Gasto variável: fora essenciais (aluguel, contas…) e pagamento de fatura.
  const variable = (t: Transaction) =>
    t.kind === 'expense' && t.categoryId !== 'cartao' && !categoryById(t.categoryId).essential;
  const monthSpent = (m: string) =>
    txs.filter((t) => variable(t) && monthOf(t.date) === m).reduce((a, t) => a + t.amount, 0);

  const history: number[] = [];
  let m = month;
  for (let i = 0; i < 3; i++) {
    m = prevMonth(m);
    const s = monthSpent(m);
    if (s > 0) history.push(s);
  }
  if (history.length === 0) return 5; // sem histórico: neutro
  history.sort((a, b) => a - b);
  const median = history[Math.floor(history.length / 2)];

  const projected = monthSpent(month) / (dayOf(today) / daysInMonth(month));
  const ratio = projected / median;
  if (ratio <= 1.1) return 10;
  if (ratio >= 1.5) return 0;
  return round2((10 * (1.5 - ratio)) / 0.4);
}

export function provisionalScore(txs: Transaction[], today: string): ProvisionalScore {
  const folga = folgaPoints(txs, today);
  const constancia = round2(registrosPoints(txs, today) + estabilidadePoints(txs, today));
  return {
    total: Math.round((folga + constancia) * 2),
    folga,
    constancia,
    provisional: true,
  };
}
