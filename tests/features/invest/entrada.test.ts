import { addGoal, listGoals, listTransactions } from '../../../src/db/repo';
import { listHoldingMoves, listHoldings } from '../../../src/db/ledger';
import { registerInvestment } from '../../../src/features/ledger/actions';
import { memoryDb } from '../../helpers/memoryDb';
import { migrate } from '../../../src/db/schema';
import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';
import { buildParts, loadHandled, markHandled, pendingIncomes } from '../../../src/features/invest/entrada';
import { buildInvestView, type ViewInput } from '../../../src/features/invest/view';
import { tx } from '../../helpers/tx';

const q = (value: number, extra?: Record<string, number | null>) => ({
  value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false, extra,
});
const settings = { profile: 'moderado' as const, term: 12 as const, amountOverride: 200000, hyp: DEFAULT_HYPOTHESES };
const base: ViewInput = {
  settings, snapshot: {}, txs: [], bills: [], goals: [], reserve: 700000, incomeSetting: 500000, today: '2026-11-09',
};

test('pendingIncomes: só ganhos recentes, sem reembolso nem os já resolvidos', () => {
  const a = tx('2026-11-08', 160000, 'income', 'bolsa');
  const old = tx('2026-10-01', 160000, 'income', 'bolsa');
  const refund = tx('2026-11-08', 3000, 'income', 'reembolso');
  const spend = tx('2026-11-08', 3000, 'expense', 'comida');
  const handled = tx('2026-11-07', 5000, 'income', 'freelance');
  const list = pendingIncomes([old, refund, spend, a, handled], new Set([handled.id]), '2026-11-09');
  expect(list.map((t) => t.id)).toEqual([a.id]);
});

test('markHandled persiste e acumula', async () => {
  const db = await memoryDb();
  await migrate(db);
  await markHandled(db, 'a');
  await markHandled(db, 'b');
  expect([...(await loadHandled(db))]).toEqual(['a', 'b']);
});

test('buildParts divide o valor e dá destino concreto a cada parte', () => {
  const snapshot = {
    'bcb.selic': q(0.15), 'bcb.cdi': q(0.149), 'bcb.ipca12m': q(0.045), 'bcb.tr': q(0.001),
    'asset:KNRI11.SA': q(150, { change12m: 0.08, dividendYield: 0.09 }),
  };
  const view = buildInvestView({ ...base, snapshot });
  const parts = buildParts(view);
  expect(parts.length).toBeGreaterThan(0);
  const total = parts.reduce((a, p) => a + p.amount, 0);
  expect(total).toBe(200000);
  const fixed = parts.find((p) => p.key === 'mixrendaFixa')!;
  expect(fixed.lines[0]).toMatch(/a\.a\. líquido/);
  const fii = parts.find((p) => p.key === 'mixfii');
  expect(fii?.lines.some((l) => l.includes('KNRI11') && l.includes('9,0%'))).toBe(true);
  expect(fii?.lines.at(-1)).toMatch(/não recomendação/);
});

test('sem sobra e sem taxas: nenhuma parte, sem quebrar', () => {
  expect(buildParts(buildInvestView({ ...base, settings: { ...settings, amountOverride: 0 } }))).toEqual([]);
  expect(() => buildParts(buildInvestView(base))).not.toThrow();
});

test('cada parte traz o destino: tipo de posição, nome sugerido ou meta', () => {
  const snapshot = {
    'bcb.selic': q(0.15), 'bcb.cdi': q(0.149), 'bcb.ipca12m': q(0.045), 'bcb.tr': q(0.001),
    'asset:KNRI11.SA': q(150, { change12m: 0.08, dividendYield: 0.09 }),
  };
  const goals = [{ id: 'g1', name: 'Viagem', target: 100000, startDate: '2026-01-01', deadline: '2027-01-01', saved: 0 }];
  const parts = buildParts(buildInvestView({
    ...base, snapshot, goals, reserve: 450000, settings: { ...settings, amountOverride: 400000 },
    txs: [tx('2026-10-05', 100000, 'expense', 'moradia')],
  }));
  const reserva = parts.find((p) => p.key.startsWith('reserva'))!;
  expect(reserva.target).toMatchObject({ kind: 'holding' });
  expect(parts.find((p) => p.key === 'metag1')?.target).toEqual({ kind: 'goal', goalId: 'g1', goalName: 'Viagem' });
  expect(parts.find((p) => p.key === 'mixfii')?.target).toMatchObject({ kind: 'holding', type: 'fii' });
});

test('registerInvestment: posição nova, existente e meta', async () => {
  const db = await memoryDb();
  await migrate(db);
  const goal = await addGoal(db, { name: 'Viagem', target: 100000, startDate: '2026-11-01', deadline: '2027-03-01' });
  await registerInvestment(db, { kind: 'new', type: 'tesouro', name: 'Selic', amount: 50000 }, '2026-11-10');
  const [h] = await listHoldings(db);
  expect(h).toMatchObject({ name: 'Selic', invested: 50000, value: 50000 });
  await registerInvestment(db, { kind: 'existing', holding: h, amount: 20000 }, '2026-11-12');
  await registerInvestment(db, { kind: 'goal', goalId: goal.id, amount: 3000 }, '2026-11-12');
  expect((await listHoldings(db))[0]).toMatchObject({ invested: 70000, value: 70000 });
  expect((await listHoldingMoves(db)).map((m) => m.amount)).toEqual([50000, 20000]);
  expect((await listGoals(db))[0].saved).toBe(3000);
  expect(await listTransactions(db, '2026-11-01', '2026-11-30')).toHaveLength(2);
});
