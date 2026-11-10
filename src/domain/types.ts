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

/** Tipos de ganho recorrente. O id é também o id da categoria do lançamento gerado. */
export type IncomeType = 'salario' | 'bolsa' | 'rendimento' | 'freelance' | 'beneficio' | 'renda';

export interface IncomeSource {
  id: string;
  name: string;
  type: IncomeType;
  amount: number; // centavos, por mês
  day: number; // 1..31 (meses curtos usam o último dia)
  startMonth: string; // YYYY-MM, primeiro mês a receber
  endMonth: string | null; // último mês a receber; null = sem fim
  active: boolean;
}

export type HoldingType =
  | 'poupanca' | 'tesouro' | 'cdb' | 'lciLca' | 'fii' | 'acoes' | 'exterior' | 'cripto' | 'outros';

/** Uma posição investida: quanto entrou (invested) e quanto vale hoje (value). */
export interface Holding {
  id: string;
  type: HoldingType;
  name: string;
  invested: number; // centavos
  value: number; // centavos
  updatedAt: string; // YYYY-MM-DD
}

/** Fotografia manual de um mês: o que o usuário viu no app do banco no fim dele. */
export interface MonthSnapshot {
  month: string; // YYYY-MM
  accountBalance: number | null; // centavos
  invested: number | null; // centavos
}

/** Entrada ou saída de dinheiro de uma posição, com data: base para comparar o rendimento no tempo. */
export interface HoldingMove {
  id: string;
  holdingId: string;
  date: string; // YYYY-MM-DD
  kind: 'aporte' | 'resgate';
  amount: number; // centavos, > 0
}
