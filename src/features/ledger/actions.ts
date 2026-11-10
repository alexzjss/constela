import type { Db } from '../../db/db';
import {
  addHolding, addHoldingMove, listIncomeRuns, listIncomeSources, markIncomeRun, updateHolding,
} from '../../db/ledger';
import { addToGoal, getSetting, insertTransaction } from '../../db/repo';
import type { Holding, HoldingType } from '../../domain/types';
import { applyMove } from '../../engine/holdings';
import { dueRuns, expectedFromSources, incomeTypeLabel } from '../../engine/income';
import type { Cents } from '../../lib/money';

/**
 * Lança como ganho cada recebimento recorrente que já venceu e ainda não foi lançado.
 * Idempotente: income_runs lembra os meses já feitos, mesmo se o lançamento for apagado depois.
 */
export async function materializeIncome(db: Db, today: string): Promise<number> {
  const sources = await listIncomeSources(db);
  const done = new Set((await listIncomeRuns(db)).map((r) => `${r.sourceId}|${r.month}`));
  const runs = dueRuns(sources, done, today);
  for (const r of runs) {
    const s = sources.find((x) => x.id === r.sourceId)!;
    await insertTransaction(db, {
      kind: 'income', amount: s.amount, date: r.date, categoryId: s.type,
      description: s.name || incomeTypeLabel(s.type), source: 'form', externalId: `inc:${s.id}|${r.month}`,
    });
    await markIncomeRun(db, r.sourceId, r.month);
  }
  return runs.length;
}

/** Aporte ou resgate numa posição; guarda o movimento e um lançamento interno para aparecer no mês. */
export async function moveHolding(
  db: Db, h: Holding, move: 'aporte' | 'resgate', amount: Cents, today: string,
): Promise<Holding> {
  const next = applyMove(h, move, amount, today);
  await updateHolding(db, next);
  const moved = move === 'aporte' ? next.invested - h.invested : h.value - next.value;
  if (moved > 0) {
    await addHoldingMove(db, { holdingId: h.id, date: today, kind: move, amount: moved });
    await insertTransaction(db, {
      kind: 'internal', amount: moved, date: today, categoryId: 'investimento',
      description: `${move === 'aporte' ? 'Aporte' : 'Resgate'} ${h.name}`, source: 'form',
    });
  }
  return next;
}

/** Cria uma posição. `since` é quando o dinheiro entrou (padrão hoje); o aportado vira o primeiro movimento. */
export async function createHolding(
  db: Db, input: { type: HoldingType; name: string; invested: Cents; value: Cents }, today: string, since = today,
): Promise<Holding> {
  const h = await addHolding(db, { ...input, updatedAt: today });
  if (input.invested > 0) await addHoldingMove(db, { holdingId: h.id, date: since, kind: 'aporte', amount: input.invested });
  return h;
}

export type Registration =
  | { kind: 'goal'; goalId: string; amount: Cents }
  | { kind: 'existing'; holding: Holding; amount: Cents }
  | { kind: 'new'; type: HoldingType; name: string; amount: Cents };

/** O usuário aceitou uma parte da sugestão e investiu de fato: grava onde e quanto. */
export async function registerInvestment(db: Db, r: Registration, today: string): Promise<void> {
  if (r.kind === 'goal') {
    await addToGoal(db, r.goalId, r.amount);
  } else if (r.kind === 'existing') {
    await moveHolding(db, r.holding, 'aporte', r.amount, today);
  } else {
    const h = await createHolding(db, { type: r.type, name: r.name, invested: 0, value: 0 }, today);
    await moveHolding(db, h, 'aporte', r.amount, today);
  }
}

/** Renda esperada digitada; sem ela, a soma dos ganhos recorrentes do mês; sem nenhum, null. */
export async function incomeSetting(db: Db, month: string): Promise<Cents | null> {
  const typed = Number(await getSetting(db, 'monthlyIncome'));
  if (typed > 0) return typed;
  const fromSources = expectedFromSources(await listIncomeSources(db), month);
  return fromSources > 0 ? fromSources : null;
}
