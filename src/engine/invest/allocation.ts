import type { Cents } from '../../lib/money';
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

/**
 * Reparte `amount` priorizando as classes mais abaixo da meta do perfil, contando o que o usuário já tem.
 * Classe acima da meta não recebe nada. Sem lacuna nenhuma, cai no mix puro.
 */
export function rebalanceSplit(
  amount: Cents, profile: Profile, portfolio: Record<AssetClass, Cents>,
): Record<AssetClass, Cents> {
  const mix = PROFILE_MIX[profile];
  const held = ASSET_CLASSES.reduce((a, c) => a + portfolio[c], 0);
  const total = held + amount;
  const gap = {} as Record<AssetClass, number>;
  let sumGap = 0;
  let biggest: AssetClass = ASSET_CLASSES[0];
  for (const c of ASSET_CLASSES) {
    gap[c] = Math.max(0, (total * mix[c]) / 100 - portfolio[c]);
    sumGap += gap[c];
    if (gap[c] > gap[biggest]) biggest = c;
  }
  if (sumGap <= 0) return splitByMix(amount, profile);
  const out = {} as Record<AssetClass, Cents>;
  let used = 0;
  for (const c of ASSET_CLASSES) {
    out[c] = Math.floor((amount * gap[c]) / sumGap);
    used += out[c];
  }
  out[biggest] += amount - used;
  return out;
}

export function classRange(pct: number): { min: number; max: number } | null {
  if (pct <= 0) return null;
  return { min: Math.max(0, pct - 5), max: Math.min(100, pct + 5) };
}

export type PlanWarning = 'sem-valor';
export type PlanStep = { kind: 'mix'; amount: Cents; byClass: Record<AssetClass, Cents> };

export interface PlanInput {
  amount: Cents;
  profile: Profile;
  /** Quanto já está investido em cada classe; sem isso vale o mix puro do perfil. */
  portfolio?: Record<AssetClass, Cents>;
}

export interface Plan {
  steps: PlanStep[];
  warnings: PlanWarning[];
}

export function planAllocation(input: PlanInput): Plan {
  const { amount, profile, portfolio } = input;
  if (amount <= 0) return { steps: [], warnings: ['sem-valor'] };
  return {
    steps: [{
      kind: 'mix', amount,
      byClass: portfolio ? rebalanceSplit(amount, profile, portfolio) : splitByMix(amount, profile),
    }],
    warnings: [],
  };
}
