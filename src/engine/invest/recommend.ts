import type { Cents } from '../../lib/money';
import { classRange, PROFILE_MIX, planAllocation, type Plan, type PlanInput } from './allocation';
import { rankFixedIncome, type FixedIncomeResult } from './fixedIncome';
import { ASSET_CLASSES, type AssetClass, type Hypotheses, type ProductId, type Rates, type Term } from './types';

export interface RecommendInput extends PlanInput {
  term: Term;
  rates: Rates;
  hyp: Hypotheses;
}

export interface ClassAllocation {
  cls: AssetClass;
  pct: number;
  range: { min: number; max: number } | null;
  amount: Cents;
}

export interface Recommendation {
  plan: Plan;
  ranking: FixedIncomeResult[];
  reserveProduct: ProductId | null;
  fixedProduct: ProductId | null;
  classes: ClassAllocation[];
}

const REFERENCE_PRINCIPAL = 100000; // R$ 1.000 quando não há valor

export function recommend(input: RecommendInput): Recommendation {
  const plan = planAllocation(input);
  const ranking = rankFixedIncome(
    input.amount > 0 ? input.amount : REFERENCE_PRINCIPAL, input.term, input.rates, input.hyp,
  );
  const mix = plan.steps.find((s) => s.kind === 'mix');
  const classes = ASSET_CLASSES.map((cls) => {
    const pct = PROFILE_MIX[input.profile][cls];
    return { cls, pct, range: classRange(pct), amount: mix && mix.kind === 'mix' ? mix.byClass[cls] : 0 };
  });
  return {
    plan, ranking, classes,
    reserveProduct: ranking.find((r) => r.liquidity === 'diaria')?.id ?? null,
    fixedProduct: ranking[0]?.id ?? null,
  };
}
