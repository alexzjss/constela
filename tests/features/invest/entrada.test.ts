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
