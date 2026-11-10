import { compositeScore, essentialMonthlyAverage, rdbNet } from '../../src/engine/composite';
import { tx } from '../helpers/tx';
import type { Goal } from '../../src/domain/types';

const TODAY = '2026-11-15';
const base = { txs: [], today: TODAY, reserve: null, essentialMonthly: 0, goals: [] as Goal[], expectedIncome: 160000 };
const goal = (saved: number): Goal => ({ id: 'g', name: 'Viagem', target: 29000, startDate: '2026-11-01', deadline: '2026-11-30', saved });

test('sem reserva nem metas é o score provisório', () => {
  const s = compositeScore(base);
  expect(s.provisional).toBe(true);
  expect(s.reserva).toBeNull();
  expect(s.rumo).toBeNull();
});

test('Reserva é linear: 3 meses de 6 valem 15 pontos, 6 ou mais valem 30', () => {
  expect(compositeScore({ ...base, reserve: 300000, essentialMonthly: 100000 }).reserva).toBe(15);
  expect(compositeScore({ ...base, reserve: 900000, essentialMonthly: 100000 }).reserva).toBe(30);
  expect(compositeScore({ ...base, reserve: 0, essentialMonthly: 100000 }).reserva).toBe(0);
});

test('Rumo compara o guardado com o planejado até hoje', () => {
  // planejado = 29000 * 14/29 = 14000
  expect(compositeScore({ ...base, goals: [goal(7000)] }).rumo).toBe(10);
  expect(compositeScore({ ...base, goals: [goal(14000)] }).rumo).toBe(20);
  expect(compositeScore({ ...base, goals: [goal(99999)] }).rumo).toBe(20);
});

test('meta recém-criada (nada planejado ainda) não pune', () => {
  const g = { ...goal(0), startDate: TODAY };
  expect(compositeScore({ ...base, goals: [g] }).rumo).toBe(20);
});

test('só Reserva conhecida: Rumo entra neutro (10) e continua provisório', () => {
  const s = compositeScore({ ...base, reserve: 600000, essentialMonthly: 100000 });
  expect(s.provisional).toBe(true);
  expect(s.total).toBe(Math.round(s.folga + s.constancia + 30 + 10));
});

test('com Reserva e Rumo conhecidos o score é a soma dos 4 pilares', () => {
  const s = compositeScore({ ...base, reserve: 600000, essentialMonthly: 100000, goals: [goal(14000)] });
  expect(s.provisional).toBe(false);
  expect(s.total).toBe(Math.round(s.folga + 30 + s.constancia + 20));
});

const everyDay = Array.from({ length: 14 }, (_, i) => tx(`2026-11-${String(15 - i).padStart(2, '0')}`, 100, 'expense', 'comida'));

test('próxima ação: reserva zerada sugere guardar e mostra o ganho', () => {
  const s = compositeScore({ ...base, txs: everyDay, reserve: 0, essentialMonthly: 100000 });
  expect(s.next?.kind).toBe('reserva');
  expect(s.next?.gain).toBeGreaterThanOrEqual(1);
});

test('dias sem registro viram a próxima ação quando é o maior ganho', () => {
  const s = compositeScore({ ...base, reserve: 900000, essentialMonthly: 100000, goals: [goal(99999)] });
  expect(s.next?.kind).toBe('registros');
});

test('sem nada a melhorar não há próxima ação', () => {
  const s = compositeScore({ ...base, txs: [tx('2026-11-01', 160000, 'income', 'renda'), ...everyDay], reserve: 900000, essentialMonthly: 100000, goals: [goal(99999)] });
  expect(s.next).toBeNull();
});

test('gasto essencial mensal: média dos meses anteriores com dados, essenciais e fatura', () => {
  const txs = [
    tx('2026-09-05', 80000, 'expense', 'moradia'), tx('2026-09-06', 9999, 'expense', 'lazer'),
    tx('2026-10-05', 100000, 'expense', 'moradia'), tx('2026-10-06', 20000, 'expense', 'cartao'),
  ];
  expect(essentialMonthlyAverage(txs, TODAY)).toBe(100000); // (80000 + 120000) / 2
  expect(essentialMonthlyAverage([], TODAY)).toBe(0);
});

test('rdbNet: aplicações menos resgates, nunca negativo', () => {
  const a = { ...tx('2026-10-01', 50000, 'internal', 'reserva'), description: 'Aplicação RDB' };
  const r = { ...tx('2026-10-05', 20000, 'internal', 'reserva'), description: 'Resgate RDB' };
  expect(rdbNet([a, r])).toBe(30000);
  expect(rdbNet([r])).toBe(0);
});
