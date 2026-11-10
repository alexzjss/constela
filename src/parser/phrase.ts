import type { Draft } from '../domain/types';
import { addDays, daysInMonth, dayOf, monthOf, prevMonth } from '../lib/dates';
import { parseBRL } from '../lib/money';
import { categorizeMerchant } from './merchants';

const INCOME = /\b(recebi|ganhei|caiu|entrou|salario|freela)\b/;

/** "gastei 35 no almoço" -> rascunho de lançamento. null se não houver valor. */
export function parsePhrase(
  text: string,
  today: string,
  userRules: Record<string, string>,
): Draft | null {
  let rest = text.trim();
  if (!rest) return null;
  const plain = rest.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  let date = today;
  const dayMatch = plain.match(/\bdia\s+(\d{1,2})\b/);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    const month = n > dayOf(today) ? prevMonth(monthOf(today)) : monthOf(today);
    date = `${month}-${String(Math.min(n, daysInMonth(month))).padStart(2, '0')}`;
    rest = rest.replace(/\bdia\s+\d{1,2}\b/i, ' ');
  } else if (/\banteontem\b/.test(plain)) {
    date = addDays(today, -2);
  } else if (/\bontem\b/.test(plain)) {
    date = addDays(today, -1);
  }
  rest = rest.replace(/\b(anteontem|ontem|hoje)\b/gi, ' ');

  const m = rest.match(/(?:R\$\s*)?\d[\d.,]*/i);
  const amount = m ? parseBRL(m[0].replace(/[.,]$/, '')) : null;
  if (!m || amount === null || amount <= 0) return null;
  rest = rest.replace(m[0], ' ');

  const description = rest.replace(/\s+/g, ' ').trim();
  const kind = INCOME.test(plain) ? 'income' : 'expense';
  const categoryId = kind === 'income' ? 'renda' : categorizeMerchant(description, userRules);
  return { kind, amount, date, categoryId, description };
}
