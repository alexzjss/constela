import type { Db } from '../../db/db';
import {
  addHolding, listIncomeRuns, listIncomeSources, markIncomeRun, updateHolding,
} from '../../db/ledger';
import { getSetting, insertTransaction } from '../../db/repo';
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
      description: s.name || incomeTypeLabel(s.type), source: 'form',
    });
    await markIncomeRun(db, r.sourceId, r.month);
  }
  return runs.length;
}

/** Aporte ou resgate numa posição; registra um lançamento interno para aparecer no mês. */
export async function moveHolding(
  db: Db, h: Holding, move: 'aporte' | 'resgate', amount: Cents, today: string,
): Promise<Holding> {
  const next = applyMove(h, move, amount, today);
  await updateHolding(db, next);
  const moved = move === 'aporte' ? next.invested - h.invested : h.value - next.value;
  if (moved > 0) {
    await insertTransaction(db, {
      kind: 'internal', amount: moved, date: today, categoryId: 'investimento',
      description: `${move === 'aporte' ? 'Aporte' : 'Resgate'} ${h.name}`, source: 'form',
    });
  }
  return next;
}

export async function createHolding(
  db: Db, input: { type: HoldingType; name: string; invested: Cents; value: Cents }, today: string,
): Promise<Holding> {
  return addHolding(db, { ...input, updatedAt: today });
}

/** Renda esperada digitada; sem ela, a soma dos ganhos recorrentes do mês; sem nenhum, null. */
export async function incomeSetting(db: Db, month: string): Promise<Cents | null> {
  const typed = Number(await getSetting(db, 'monthlyIncome'));
  if (typed > 0) return typed;
  const fromSources = expectedFromSources(await listIncomeSources(db), month);
  return fromSources > 0 ? fromSources : null;
}
