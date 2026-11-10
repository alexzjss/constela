import type { Holding, HoldingMove } from '../domain/types';
import type { Db } from './db';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export async function addHolding(db: Db, h: Omit<Holding, 'id'>): Promise<Holding> {
  const holding: Holding = { ...h, id: newId() };
  await db.run(
    `INSERT INTO holdings (id, type, name, invested, value, updatedAt, symbol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [holding.id, holding.type, holding.name, holding.invested, holding.value, holding.updatedAt, holding.symbol ?? null],
  );
  return holding;
}

export async function listHoldings(db: Db): Promise<Holding[]> {
  return db.all<Holding>(`SELECT * FROM holdings ORDER BY type, name`);
}

export async function updateHolding(db: Db, h: Holding): Promise<void> {
  await db.run(
    `UPDATE holdings SET type = ?, name = ?, invested = ?, value = ?, updatedAt = ?, symbol = ? WHERE id = ?`,
    [h.type, h.name, h.invested, h.value, h.updatedAt, h.symbol ?? null, h.id],
  );
}

export async function deleteHolding(db: Db, id: string): Promise<void> {
  await db.run(`DELETE FROM holdings WHERE id = ?`, [id]);
  await db.run(`DELETE FROM holding_moves WHERE holdingId = ?`, [id]);
}

export async function addHoldingMove(db: Db, m: Omit<HoldingMove, 'id'>): Promise<HoldingMove> {
  const move: HoldingMove = { ...m, id: newId() };
  await db.run(
    `INSERT INTO holding_moves (id, holdingId, date, kind, amount) VALUES (?, ?, ?, ?, ?)`,
    [move.id, move.holdingId, move.date, move.kind, move.amount],
  );
  return move;
}

export async function listHoldingMoves(db: Db): Promise<HoldingMove[]> {
  return db.all<HoldingMove>(`SELECT * FROM holding_moves ORDER BY date, id`);
}
