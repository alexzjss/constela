import type { Holding, HoldingType, Transaction } from '../domain/types';
import { monthOf } from '../lib/dates';
import type { Cents } from '../lib/money';

export const HOLDING_TYPES: { id: HoldingType; label: string }[] = [
  { id: 'poupanca', label: 'Poupança' },
  { id: 'tesouro', label: 'Tesouro' },
  { id: 'cdb', label: 'CDB/RDB' },
  { id: 'lciLca', label: 'LCI/LCA' },
  { id: 'fii', label: 'FIIs' },
  { id: 'acoes', label: 'Ações' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'cripto', label: 'Cripto' },
  { id: 'outros', label: 'Outros' },
];

export const holdingTypeLabel = (t: HoldingType): string =>
  HOLDING_TYPES.find((x) => x.id === t)?.label ?? 'Outros';

export interface HoldingGroup {
  type: HoldingType;
  invested: Cents;
  value: Cents;
  items: Holding[];
}

export interface HoldingsSummary {
  invested: Cents;
  value: Cents;
  gain: Cents; // value − invested
  groups: HoldingGroup[];
}

/** Agrupa por tipo, na ordem de HOLDING_TYPES, só os que têm posição. */
export function summarizeHoldings(holdings: Holding[]): HoldingsSummary {
  const groups: HoldingGroup[] = [];
  for (const { id } of HOLDING_TYPES) {
    const items = holdings.filter((h) => h.type === id);
    if (!items.length) continue;
    groups.push({
      type: id,
      items,
      invested: items.reduce((a, h) => a + h.invested, 0),
      value: items.reduce((a, h) => a + h.value, 0),
    });
  }
  const invested = groups.reduce((a, g) => a + g.invested, 0);
  const value = groups.reduce((a, g) => a + g.value, 0);
  return { invested, value, gain: value - invested, groups };
}

/** Rendimento em fração do investido (0,05 = 5%); null se nada foi investido. */
export const gainPct = (invested: Cents, value: Cents): number | null =>
  invested > 0 ? (value - invested) / invested : null;

/** Aporte soma ao investido e ao valor; resgate tira do valor e do investido na mesma proporção (custo médio). */
export function applyMove(h: Holding, move: 'aporte' | 'resgate', amount: Cents, today: string): Holding {
  if (move === 'aporte') {
    return { ...h, invested: h.invested + amount, value: h.value + amount, updatedAt: today };
  }
  const out = Math.min(amount, h.value);
  const ratio = h.value > 0 ? out / h.value : 0;
  return {
    ...h,
    value: h.value - out,
    invested: Math.max(0, h.invested - Math.round(h.invested * ratio)),
    updatedAt: today,
  };
}

/** Aportes menos resgates lançados no mês (lançamentos internos de categoria "investimento"). */
export function investedInMonth(txs: Transaction[], month: string): Cents {
  let net = 0;
  for (const t of txs) {
    if (t.kind !== 'internal' || t.categoryId !== 'investimento' || monthOf(t.date) !== month) continue;
    net += t.description.startsWith('Resgate') ? -t.amount : t.amount;
  }
  return net;
}
