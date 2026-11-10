import type { Goal } from '../../domain/types';
import { daysBetween } from '../../lib/dates';
import type { Cents } from '../../lib/money';
import { goalRatio } from '../composite';
import { ASSET_CLASSES, type AssetClass, type Profile } from './types';

export const PROFILE_MIX: Record<Profile, Record<AssetClass, number>> = {
  conservador: { rendaFixa: 90, fii: 5, acoesBr: 5, exterior: 0, cripto: 0 },
  moderado: { rendaFixa: 60, fii: 15, acoesBr: 15, exterior: 8, cripto: 2 },
  arrojado: { rendaFixa: 30, fii: 20, acoesBr: 25, exterior: 20, cripto: 5 },
};

export function splitByMix(total: Cents, profile: Profile): Record<AssetClass, Cents> {
  const mix = PROFILE_MIX[profile];
  const out = {} as Record<AssetClass, Cents>;
  let used = 0;
  let biggest: AssetClass = ASSET_CLASSES[0];
  for (const c of ASSET_CLASSES) {
    out[c] = Math.floor((total * mix[c]) / 100);
    used += out[c];
    if (mix[c] > mix[biggest]) biggest = c;
  }
  out[biggest] += total - used;
  return out;
}

export function classRange(pct: number): { min: number; max: number } | null {
  if (pct <= 0) return null;
  return { min: Math.max(0, pct - 5), max: Math.min(100, pct + 5) };
}

export type PlanWarning = 'reserva-baixa' | 'reserva-desconhecida' | 'sem-valor';
export type PlanStep =
  | { kind: 'reserva'; amount: Cents }
  | { kind: 'meta'; amount: Cents; goalId: string; goalName: string }
  | { kind: 'mix'; amount: Cents; byClass: Record<AssetClass, Cents> };

export interface PlanInput {
  amount: Cents;
  profile: Profile;
  reserve: Cents | null;
  essentialMonthly: Cents;
  goals: Goal[];
  today: string;
}

export interface Plan {
  steps: PlanStep[];
  warnings: PlanWarning[];
  reserveMonths: number | null;
}

const RESERVE_TARGET_MONTHS = 6;

export function planAllocation(input: PlanInput): Plan {
  const { amount, profile, reserve, essentialMonthly, goals, today } = input;
  if (amount <= 0) return { steps: [], warnings: ['sem-valor'], reserveMonths: null };

  const steps: PlanStep[] = [];
  const warnings: PlanWarning[] = [];
  let left = amount;
  let reserveMonths: number | null = null;

  if (reserve === null || essentialMonthly <= 0) {
    warnings.push('reserva-desconhecida');
  } else {
    reserveMonths = reserve / essentialMonthly;
    const gap = Math.max(0, RESERVE_TARGET_MONTHS * essentialMonthly - reserve);
    if (reserveMonths < RESERVE_TARGET_MONTHS) warnings.push('reserva-baixa');
    const share = reserveMonths < 3 ? amount : Math.round(amount / 2);
    const toReserve = Math.min(gap, share, left);
    if (toReserve > 0) {
      steps.push({ kind: 'reserva', amount: toReserve });
      left -= toReserve;
    }
  }

  const late = goals
    .filter((g) => daysBetween(today, g.deadline) < 365 && goalRatio(g, today) < 1)
    .sort((a, b) => (a.deadline < b.deadline ? -1 : 1));
  for (const g of late) {
    const remaining = g.target - g.saved;
    if (remaining <= 0 || left <= 0) continue;
    const days = daysBetween(today, g.deadline);
    const installment = days <= 0 ? remaining : Math.ceil(remaining / Math.ceil(days / 30));
    const amt = Math.min(installment, left);
    steps.push({ kind: 'meta', amount: amt, goalId: g.id, goalName: g.name });
    left -= amt;
  }

  if (left > 0) steps.push({ kind: 'mix', amount: left, byClass: splitByMix(left, profile) });
  return { steps, warnings, reserveMonths };
}
