import { categoryById } from '../domain/categories';
import type { Goal, Transaction } from '../domain/types';
import { daysBetween, monthOf, prevMonth } from '../lib/dates';
import type { Cents } from '../lib/money';
import { provisionalScore, registrosPoints, windowStats } from './score';

export interface NextAction {
  kind: 'reserva' | 'registros' | 'meta';
  amount: Cents | null; // quanto guardar (reserva/meta); null em registros
  gain: number; // pontos inteiros
}

export interface Score {
  total: number;
  folga: number; // 0..30
  reserva: number | null; // 0..30, null = desconhecida
  constancia: number; // 0..20
  rumo: number | null; // 0..20, null = sem metas
  provisional: boolean;
  next: NextAction | null;
  detail: {
    savingsPct: number | null; // sobra da renda nos últimos 30 dias
    coveredDays: number; // dos últimos 14
    reserveMonths: number | null;
    goalsPct: number | null; // média do guardado / planejado
  };
}

export interface ScoreInput {
  txs: Transaction[];
  today: string;
  reserve: Cents | null; // saldo da reserva; null = não informado
  essentialMonthly: Cents;
  goals: Goal[];
  expectedIncome: Cents;
}

const RESERVE_TARGET_MONTHS = 6;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function goalRatio(g: Goal, today: string): number {
  const total = Math.max(1, daysBetween(g.startDate, g.deadline));
  const elapsed = Math.min(total, Math.max(0, daysBetween(g.startDate, today)));
  const planned = (g.target * elapsed) / total;
  return planned <= 0 ? 1 : Math.min(1, g.saved / planned);
}

function raw(input: ScoreInput) {
  const base = provisionalScore(input.txs, input.today);
  const reserveMonths =
    input.reserve !== null && input.essentialMonthly > 0 ? input.reserve / input.essentialMonthly : null;
  const reserva =
    reserveMonths === null ? null : round2(30 * Math.min(1, reserveMonths / RESERVE_TARGET_MONTHS));
  const ratios = input.goals.map((g) => goalRatio(g, input.today));
  const goalsPct = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
  const rumo = goalsPct === null ? null : round2(20 * goalsPct);

  // Pilar desconhecido entra neutro (Reserva 15, Rumo 10); sem nenhum dos dois, vale o provisório.
  const sum =
    reserva === null && rumo === null
      ? base.total
      : base.folga + base.constancia + (reserva ?? 15) + (rumo ?? 10);
  return { base, reserva, rumo, reserveMonths, goalsPct, sum };
}

function step(expectedIncome: Cents): Cents {
  return Math.max(5000, Math.round((expectedIncome * 0.1) / 1000) * 1000);
}

export function compositeScore(input: ScoreInput): Score {
  const r = raw(input);
  const { income, spent } = windowStats(input.txs, input.today);
  const regPts = registrosPoints(input.txs, input.today);

  const candidates: NextAction[] = [];
  const x = step(input.expectedIncome);
  if (r.reserva !== null) {
    const gain = Math.round(raw({ ...input, reserve: (input.reserve ?? 0) + x }).sum - r.sum);
    if (gain >= 1) candidates.push({ kind: 'reserva', amount: x, gain });
  }
  const regGain = Math.round(10 - regPts);
  if (regGain >= 1) candidates.push({ kind: 'registros', amount: null, gain: regGain });
  const behind = input.goals.find((g) => goalRatio(g, input.today) < 1);
  if (behind) {
    const bumped = input.goals.map((g) => (g.id === behind.id ? { ...g, saved: g.saved + x } : g));
    const gain = Math.round(raw({ ...input, goals: bumped }).sum - r.sum);
    if (gain >= 1) candidates.push({ kind: 'meta', amount: x, gain });
  }
  const next = candidates.sort((a, b) => b.gain - a.gain)[0] ?? null;

  return {
    total: Math.round(r.sum),
    folga: r.base.folga,
    reserva: r.reserva,
    constancia: r.base.constancia,
    rumo: r.rumo,
    provisional: r.reserva === null || r.rumo === null,
    next,
    detail: {
      savingsPct: income > 0 ? (income - spent) / income : null,
      coveredDays: Math.round((regPts / 10) * 14),
      reserveMonths: r.reserveMonths,
      goalsPct: r.goalsPct,
    },
  };
}

/** Média mensal de gasto essencial (categorias essenciais + fatura) nos até 3 meses anteriores com dados. */
export function essentialMonthlyAverage(txs: Transaction[], today: string): Cents {
  const totals: number[] = [];
  let m = monthOf(today);
  for (let i = 0; i < 3; i++) {
    m = prevMonth(m);
    const sum = txs
      .filter(
        (t) =>
          t.kind === 'expense' &&
          monthOf(t.date) === m &&
          (t.categoryId === 'cartao' || categoryById(t.categoryId).essential),
      )
      .reduce((a, t) => a + t.amount, 0);
    if (sum > 0) totals.push(sum);
  }
  return totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
}

/** Saldo estimado da caixinha: aplicações RDB menos resgates, nunca negativo. */
export function rdbNet(txs: Transaction[]): Cents {
  let net = 0;
  for (const t of txs) {
    if (t.kind !== 'internal') continue;
    if (t.description.startsWith('Aplicação RDB')) net += t.amount;
    else if (t.description.startsWith('Resgate RDB')) net -= t.amount;
  }
  return Math.max(0, net);
}
