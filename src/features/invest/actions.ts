import type { Db } from '../../db/db';
import { addHolding, addHoldingMove, updateHolding } from '../../db/holdings';
import type { Holding, HoldingType } from '../../domain/types';
import { applyMove } from '../../engine/holdings';
import type { Cents } from '../../lib/money';

/** Aporte ou resgate numa posição; guarda o movimento para medir o rendimento no tempo. */
export async function moveHolding(
  db: Db, h: Holding, move: 'aporte' | 'resgate', amount: Cents, today: string,
): Promise<Holding> {
  const next = applyMove(h, move, amount, today);
  await updateHolding(db, next);
  const moved = move === 'aporte' ? next.invested - h.invested : h.value - next.value;
  if (moved > 0) await addHoldingMove(db, { holdingId: h.id, date: today, kind: move, amount: moved });
  return next;
}

/** Cria uma posição. `since` é quando o dinheiro entrou (padrão hoje); o aportado vira o primeiro movimento. */
export async function createHolding(
  db: Db,
  input: { type: HoldingType; name: string; invested: Cents; value: Cents; symbol?: string | null },
  today: string,
  since = today,
): Promise<Holding> {
  const h = await addHolding(db, {
    type: input.type, name: input.name, invested: input.invested, value: input.value,
    symbol: input.symbol ?? null, updatedAt: today,
  });
  if (input.invested > 0) await addHoldingMove(db, { holdingId: h.id, date: since, kind: 'aporte', amount: input.invested });
  return h;
}

export type Registration =
  | { kind: 'existing'; holding: Holding; amount: Cents }
  | { kind: 'new'; type: HoldingType; name: string; amount: Cents; symbol?: string | null };

/** O usuário aceitou uma parte da sugestão e investiu de fato: grava onde e quanto. */
export async function registerInvestment(db: Db, r: Registration, today: string): Promise<void> {
  if (r.kind === 'existing') {
    await moveHolding(db, r.holding, 'aporte', r.amount, today);
  } else {
    const h = await createHolding(db, { type: r.type, name: r.name, invested: 0, value: 0, symbol: r.symbol }, today);
    await moveHolding(db, h, 'aporte', r.amount, today);
  }
}
