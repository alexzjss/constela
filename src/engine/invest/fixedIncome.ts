import { formatBRL, type Cents } from '../../lib/money';
import { iofRate, irRate, termDays } from './tax';
import type { ExplainLine, Hypotheses, ProductId, Rates, Term } from './types';

export const PRODUCTS: Record<
  ProductId,
  { name: string; liquidity: 'diaria' | 'vencimento'; taxed: boolean; custody: boolean }
> = {
  poupanca: { name: 'Poupança', liquidity: 'diaria', taxed: false, custody: false },
  tesouroSelic: { name: 'Tesouro Selic', liquidity: 'diaria', taxed: true, custody: true },
  tesouroPre: { name: 'Tesouro Prefixado', liquidity: 'vencimento', taxed: true, custody: true },
  tesouroIpca: { name: 'Tesouro IPCA+', liquidity: 'vencimento', taxed: true, custody: true },
  cdb: { name: 'CDB', liquidity: 'diaria', taxed: true, custody: false },
  lciLca: { name: 'LCI/LCA', liquidity: 'vencimento', taxed: false, custody: false },
};

export interface FixedIncomeResult {
  id: ProductId;
  name: string;
  liquidity: 'diaria' | 'vencimento';
  term: Term;
  days: number;
  grossAnnual: number;
  netAnnual: number;
  gain: Cents;
  ir: Cents;
  iof: Cents;
  custody: Cents;
  netProfit: Cents;
  finalValue: Cents;
  explain: ExplainLine[];
}

const pct = (x: number) => `${(x * 100).toFixed(2).replace('.', ',')}%`;

/** Taxa bruta anual e a frase que a explica; null se faltar dado. */
function grossRate(
  id: ProductId, term: Term, r: Rates, h: Hypotheses,
): { annual: number; how: string } | null {
  switch (id) {
    case 'poupanca': {
      if (r.selic === null || r.tr === null) return null;
      const base = r.selic <= 0.085 ? 0.7 * r.selic : 1.005 ** 12 - 1;
      const how = r.selic <= 0.085 ? '70% da Selic + TR' : '0,5% ao mês + TR';
      return { annual: (1 + base) * (1 + r.tr) - 1, how };
    }
    case 'tesouroSelic':
      if (r.selic === null) return null;
      return { annual: r.selic + (r.tesouroSelicSpread ?? 0), how: 'Selic + ágio/deságio do título' };
    case 'tesouroPre': {
      const t = r.tesouroPre[term];
      return t === null ? null : { annual: t, how: 'taxa de compra do título prefixado' };
    }
    case 'tesouroIpca': {
      const t = r.tesouroIpca[term];
      if (t === null || r.ipca12m === null) return null;
      return { annual: (1 + r.ipca12m) * (1 + t) - 1, how: 'IPCA 12 meses (hipótese, mantido) + taxa do título' };
    }
    case 'cdb':
      if (r.cdi === null) return null;
      return { annual: r.cdi * h.cdbPctCdi, how: `CDB a ${Math.round(h.cdbPctCdi * 100)}% do CDI (hipótese)` };
    case 'lciLca':
      if (r.cdi === null) return null;
      return { annual: r.cdi * h.lciPctCdi, how: `LCI/LCA a ${Math.round(h.lciPctCdi * 100)}% do CDI (hipótese)` };
  }
}

export function evaluateFixedIncome(
  id: ProductId, principal: Cents, term: Term, rates: Rates, hyp: Hypotheses,
): FixedIncomeResult | null {
  const g = grossRate(id, term, rates, hyp);
  if (!g || principal <= 0) return null;
  const meta = PRODUCTS[id];
  const days = termDays(term);
  const gain = Math.round(principal * ((1 + g.annual) ** (days / 365) - 1));
  const ir = meta.taxed ? Math.round(gain * irRate(days)) : 0;
  const iof = meta.taxed ? Math.round(gain * iofRate(days)) : 0;
  const custody = meta.custody ? Math.round((principal + gain) * hyp.custodyPct * (days / 365)) : 0;
  const netProfit = gain - ir - iof - custody;
  const netAnnual = ((principal + netProfit) / principal) ** (365 / days) - 1;
  const explain: ExplainLine[] = [
    { label: 'Taxa bruta', value: `${pct(g.annual)} a.a. (${g.how})` },
    { label: 'Prazo', value: `${days} dias` },
    { label: 'Ganho bruto', value: formatBRL(gain, { cents: true }) },
    { label: 'IR', value: meta.taxed ? `${pct(irRate(days))} sobre o ganho` : 'isento' },
    { label: 'IOF', value: iof > 0 ? `${pct(iofRate(days))} sobre o ganho` : 'não se aplica' },
    { label: 'Custódia B3', value: meta.custody ? `${pct(hyp.custodyPct)} a.a. (hipótese)` : 'não se aplica' },
  ];
  return {
    id, name: meta.name, liquidity: meta.liquidity, term, days,
    grossAnnual: g.annual, netAnnual, gain, ir, iof, custody, netProfit,
    finalValue: principal + netProfit, explain,
  };
}

export function rankFixedIncome(
  principal: Cents, term: Term, rates: Rates, hyp: Hypotheses,
): FixedIncomeResult[] {
  return (Object.keys(PRODUCTS) as ProductId[])
    .map((id) => evaluateFixedIncome(id, principal, term, rates, hyp))
    .filter((r): r is FixedIncomeResult => r !== null)
    .sort((a, b) => b.netProfit - a.netProfit);
}
