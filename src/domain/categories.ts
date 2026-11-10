import type { Category } from './types';

const c = (
  id: string, name: string, color: string, tint: string, essential: boolean,
  kind: Category['kind'] = 'expense',
): Category => ({ id, name, color, tint, essential, kind });

export const DEFAULT_CATEGORIES: Category[] = [
  c('comida', 'Comida', '#FF8A3D', '#FFF1E6', true),
  c('transporte', 'Transporte', '#19C78A', '#E3F8EF', true),
  c('contas', 'Contas', '#FFC53D', '#FFF7DE', true),
  c('moradia', 'Moradia', '#8C6A4F', '#F3ECE6', true),
  c('saude', 'Saúde', '#FF6B5E', '#FFE9E7', true),
  c('educacao', 'Educação', '#00B8D9', '#E0F7FB', false),
  c('lazer', 'Lazer', '#FF5DA2', '#FFE8F2', false),
  c('compras', 'Compras', '#A98BFF', '#F1ECFF', false),
  c('presentes', 'Presentes', '#E86BD8', '#FCE9F9', false),
  c('cartao', 'Cartão', '#10151C', '#E9EBEE', false),
  c('outros', 'Outros', '#8E99A8', '#EFF1F4', false),
  c('renda', 'Renda', '#2447F9', '#EEF1FF', false, 'income'),
  c('reembolso', 'Reembolso', '#4B68FF', '#EEF1FF', false, 'income'),
  c('salario', 'Salário', '#0E9F6E', '#E3F8EF', false, 'income'),
  c('bolsa', 'Bolsa', '#7C5CFF', '#F1ECFF', false, 'income'),
  c('rendimento', 'Rendimentos', '#00A3BF', '#E0F7FB', false, 'income'),
  c('freelance', 'Freela', '#F29D38', '#FFF1E6', false, 'income'),
  c('beneficio', 'Benefício', '#D6479A', '#FFE8F2', false, 'income'),
  c('reserva', 'Reserva', '#1A38D6', '#EEF1FF', false, 'internal'),
  c('investimento', 'Investimento', '#1A38D6', '#EEF1FF', false, 'internal'),
];

export const categoryById = (id: string): Category =>
  DEFAULT_CATEGORIES.find((x) => x.id === id) ?? DEFAULT_CATEGORIES.find((x) => x.id === 'outros')!;
