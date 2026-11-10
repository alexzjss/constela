import type { Cents } from '../lib/money';

export type Kind = 'expense' | 'income' | 'internal';
export type Source = 'csv' | 'text' | 'form';

export interface Category {
  id: string;
  name: string;
  color: string;
  tint: string;
  essential: boolean;
  kind: Kind;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD, local
  amount: Cents; // sempre > 0
  kind: Kind;
  categoryId: string;
  description: string;
  source: Source;
  externalId: string | null;
  needsReview: boolean;
  createdAt: string;
}

export interface Draft {
  kind: Kind;
  amount: Cents;
  date: string;
  categoryId: string;
  description: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number; // centavos
  dueDay: number; // 1..31
  categoryId: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number; // centavos
  startDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  saved: number; // centavos
}
