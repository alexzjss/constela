import type { Db } from '../../db/db';
import { getSetting, setSetting } from '../../db/repo';
import type { HoldingType, Transaction } from '../../domain/types';
import type { ProductId } from '../../engine/invest/types';
import { addDays } from '../../lib/dates';
import { formatBRL, type Cents } from '../../lib/money';
import { CLASS_LABEL } from './PlanCard';
import type { InvestView } from './view';

const KEY = 'invest.handled';
const WINDOW_DAYS = 10;
const MAX_HANDLED = 200;

export async function loadHandled(db: Db): Promise<Set<string>> {
  try {
    return new Set(JSON.parse((await getSetting(db, KEY)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Marca um ganho como visto, para o aviso "onde investir" não voltar. */
export async function markHandled(db: Db, id: string): Promise<void> {
  const ids = [...(await loadHandled(db)), id].slice(-MAX_HANDLED);
  await setSetting(db, KEY, JSON.stringify(ids));
}

/** Ganhos recentes ainda sem aviso resolvido, do mais novo para o mais velho. Reembolso não é renda nova. */
export function pendingIncomes(txs: Transaction[], handled: Set<string>, today: string): Transaction[] {
  const since = addDays(today, -WINDOW_DAYS);
  return txs
    .filter((t) => t.kind === 'income' && t.categoryId !== 'reembolso' && t.date >= since && t.date <= today && !handled.has(t.id))
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
}

/** Onde o dinheiro da parte vai parar se o usuário aceitar. */
export type Target =
  | { kind: 'holding'; type: HoldingType; name: string }
  | { kind: 'goal'; goalId: string; goalName: string };

export interface Part {
  key: string;
  label: string;
  amount: Cents;
  lines: string[];
  target: Target;
}

const PRODUCT_TYPE: Record<ProductId, HoldingType> = {
  poupanca: 'poupanca', tesouroSelic: 'tesouro', tesouroPre: 'tesouro', tesouroIpca: 'tesouro', cdb: 'cdb', lciLca: 'lciLca',
};
const CLASS_TYPE = { fii: 'fii', acoesBr: 'acoes', exterior: 'exterior', cripto: 'cripto' } as const;

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1).replace('.', ',')}%`);

/** Cada parte do valor com um destino concreto: reserva, metas e, no mix, produto de renda fixa ou ativos monitorados. */
export function buildParts(view: InvestView): Part[] {
  const { plan, ranking, reserveProduct, fixedProduct } = view.recommendation;
  const parts: Part[] = [];
  const top = (id: string | null) => ranking.find((r) => r.id === id);
  const fixedLine = (r: NonNullable<ReturnType<typeof top>>) =>
    `${r.name} · ${pct(r.netAnnual)} a.a. líquido em ${r.term} meses · ${r.liquidity === 'diaria' ? 'liquidez diária' : 'só no vencimento'}`;

  plan.steps.forEach((s, i) => {
    if (s.kind === 'reserva') {
      const r = top(reserveProduct);
      parts.push({
        key: `reserva${i}`, label: 'Reserva de emergência', amount: s.amount,
        lines: [r ? fixedLine(r) : 'Escolha uma opção com liquidez diária (Tesouro Selic ou CDB com liquidez diária).'],
        target: { kind: 'holding', type: r ? PRODUCT_TYPE[r.id] : 'tesouro', name: r?.name ?? '' },
      });
    } else if (s.kind === 'meta') {
      parts.push({
        key: `meta${s.goalId}`, label: `Meta: ${s.goalName}`, amount: s.amount,
        lines: ['Separe este valor para a meta.'],
        target: { kind: 'goal', goalId: s.goalId, goalName: s.goalName },
      });
    } else {
      view.recommendation.classes.filter((c) => c.amount > 0).forEach((c) => {
        const lines: string[] = [];
        let target: Target;
        if (c.cls === 'rendaFixa') {
          const r = top(fixedProduct);
          lines.push(r ? fixedLine(r) : 'Sem taxas no momento. Atualize na aba Investimentos.');
          target = { kind: 'holding', type: r ? PRODUCT_TYPE[r.id] : 'cdb', name: r?.name ?? '' };
        } else {
          const picks = view.assets.filter((a) => a.cls === c.cls).slice(0, 3);
          for (const a of picks) lines.push(`${a.name} · 12m ${pct(a.change12m)} · yield ${pct(a.dividendYield)}`);
          lines.push('Indicadores públicos, não recomendação de compra.');
          target = { kind: 'holding', type: CLASS_TYPE[c.cls], name: '' };
        }
        parts.push({ key: `mix${c.cls}`, label: `${CLASS_LABEL[c.cls]} (${formatBRL(c.amount)})`, amount: c.amount, lines, target });
      });
    }
  });
  return parts;
}
