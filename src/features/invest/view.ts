import type { Bill, Goal, Transaction } from '../../domain/types';
import { essentialMonthlyAverage } from '../../engine/composite';
import { PRODUCTS } from '../../engine/invest/fixedIncome';
import { recommend, type Recommendation } from '../../engine/invest/recommend';
import type { AssetClass, ExplainLine, ProductId } from '../../engine/invest/types';
import { canSpendToday, expectedMonthlyIncome } from '../../engine/today';
import { CURATED_ASSETS } from '../../invest/assets';
import { ratesFromSnapshot, type MarketSnapshot } from '../../invest/refresh';
import { formatBRL, type Cents } from '../../lib/money';
import type { InvestSettings } from './settings';

export interface AssetRow {
  symbol: string;
  name: string;
  cls: AssetClass;
  priceBrl: Cents | null;
  change12m: number | null;
  dividendYield: number | null;
  asOf: string | null;
  stale: boolean;
}

export interface InvestView {
  amount: Cents;
  defaultAmount: Cents;
  recommendation: Recommendation;
  assets: AssetRow[];
  asOf: string | null;
  anyStale: boolean;
  noData: boolean;
  snapshot: MarketSnapshot;
}

export interface ViewInput {
  settings: InvestSettings;
  snapshot: MarketSnapshot;
  txs: Transaction[];
  bills: Bill[];
  goals: Goal[];
  reserve: Cents | null;
  incomeSetting: Cents | null;
  today: string;
}

export function buildInvestView(input: ViewInput): InvestView {
  const { settings, snapshot, txs, bills, goals, reserve, incomeSetting, today } = input;
  const expectedIncome = expectedMonthlyIncome(txs, today, incomeSetting);
  const defaultAmount = Math.max(0, canSpendToday({ today, expectedIncome, bills, txs })?.available ?? 0);
  const amount = settings.amountOverride ?? defaultAmount;
  const rates = ratesFromSnapshot(snapshot);

  const recommendation = recommend({
    amount, profile: settings.profile, reserve, essentialMonthly: essentialMonthlyAverage(txs, today),
    goals, today, term: settings.term, rates, hyp: settings.hyp,
  });

  const fx = snapshot['fx.usdbrl']?.value ?? null;
  const assets: AssetRow[] = CURATED_ASSETS.map((a) => {
    const q = snapshot[`asset:${a.symbol}`];
    let priceBrl: Cents | null = null;
    if (q) {
      if (a.currency === 'BRL') priceBrl = Math.round(q.value * 100);
      else if (fx !== null) priceBrl = Math.round(q.value * fx * 100);
    }
    return {
      symbol: a.symbol, name: a.name, cls: a.cls, priceBrl,
      change12m: q?.extra?.change12m ?? null, dividendYield: q?.extra?.dividendYield ?? null,
      asOf: q?.asOf ?? null, stale: q?.stale ?? false,
    };
  });

  const quotes = Object.values(snapshot);
  return {
    amount, defaultAmount, recommendation, assets, snapshot,
    asOf: quotes.reduce<string | null>((m, x) => (m === null || x.asOf > m ? x.asOf : m), null),
    anyStale: quotes.some((x) => x.stale),
    noData: recommendation.ranking.length === 0,
  };
}

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(2).replace('.', ',')}%`);

/** Conteúdo da tela "ver a conta". ref = fixed:{id} | asset:{symbol} | plan. */
export function explainFor(
  view: InvestView, ref: string,
): { title: string; lines: ExplainLine[] } | null {
  if (ref.startsWith('fixed:')) {
    const id = ref.slice(6) as ProductId;
    const r = view.recommendation.ranking.find((x) => x.id === id);
    if (!r) return null;
    return {
      title: PRODUCTS[id].name,
      lines: [
        ...r.explain,
        { label: 'Lucro líquido', value: `${formatBRL(r.netProfit, { cents: true })} em ${r.days} dias` },
        { label: 'Rentabilidade líquida', value: `${pct(r.netAnnual)} a.a.` },
        { label: 'Aviso', value: 'Estimativa com a taxa de hoje. Não considera inflação futura nem risco de crédito.' },
      ],
    };
  }
  if (ref.startsWith('asset:')) {
    const symbol = ref.slice(6);
    const a = view.assets.find((x) => x.symbol === symbol);
    if (!a) return null;
    return {
      title: a.name,
      lines: [
        { label: 'Preço', value: a.priceBrl === null ? '—' : formatBRL(a.priceBrl, { cents: true }) },
        { label: 'Variação em 12 meses', value: pct(a.change12m) },
        { label: 'Dividend yield (12 meses)', value: `${pct(a.dividendYield)} (dividendos pagos ÷ preço)` },
        { label: 'P/L', value: '—' },
        { label: 'Fonte e data', value: `Yahoo Finance, dado de ${a.asOf ?? '—'}${a.stale ? ' (desatualizado)' : ''}` },
        { label: 'Aviso', value: 'Indicador informativo. Rentabilidade passada não garante futura.' },
      ],
    };
  }
  if (ref === 'plan') {
    const lines: ExplainLine[] = view.recommendation.plan.steps.map((s) => ({
      label: s.kind === 'reserva' ? 'Reserva de emergência' : s.kind === 'meta' ? `Meta: ${s.goalName}` : 'Mix do perfil',
      value: formatBRL(s.amount, { cents: true }),
    }));
    return { title: 'Sugestão do mês', lines };
  }
  return null;
}
