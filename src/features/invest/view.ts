import type { Holding } from '../../domain/types';
import { PRODUCTS } from '../../engine/invest/fixedIncome';
import { buildPortfolio, type PortfolioView } from '../../engine/invest/portfolio';
import { recommend, type Recommendation } from '../../engine/invest/recommend';
import type { ExplainLine, ProductId } from '../../engine/invest/types';
import { ratesFromSnapshot, type MarketSnapshot } from '../../invest/refresh';
import { formatBRL, type Cents } from '../../lib/money';
import type { InvestSettings } from './settings';

export interface InvestView {
  amount: Cents;
  recommendation: Recommendation;
  asOf: string | null;
  anyStale: boolean;
  noData: boolean;
  isReference: boolean; // sem valor: ranking calculado sobre R$ 1.000 de referência
  snapshot: MarketSnapshot;
  portfolio: PortfolioView | null; // carteira cadastrada em Investimentos
}

export interface ViewInput {
  settings: InvestSettings;
  snapshot: MarketSnapshot;
  holdings?: Holding[];
}

export function buildInvestView(input: ViewInput): InvestView {
  const { settings, snapshot, holdings = [] } = input;
  const portfolio = buildPortfolio(holdings, settings.profile);
  const amount = settings.amountOverride ?? 0;
  const rates = ratesFromSnapshot(snapshot);

  const recommendation = recommend({
    amount, profile: settings.profile, term: settings.term, rates, hyp: settings.hyp,
    portfolio: portfolio?.byClass,
  });

  const quotes = Object.values(snapshot);
  return {
    amount, recommendation, snapshot, portfolio,
    asOf: quotes.reduce<string | null>((m, x) => (m === null || x.asOf > m ? x.asOf : m), null),
    anyStale: quotes.some((x) => x.stale),
    noData: recommendation.ranking.length === 0,
    isReference: amount <= 0,
  };
}

const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const SOURCES: Record<ProductId, (term: number) => { keys: string[]; name: string }> = {
  poupanca: () => ({ keys: ['bcb.selic', 'bcb.tr'], name: 'Banco Central (Selic e TR)' }),
  tesouroSelic: () => ({ keys: ['bcb.selic', 'tesouro.selicSpread'], name: 'Banco Central (Selic) e Tesouro Transparente' }),
  tesouroPre: (t) => ({ keys: [`tesouro.pre.${t}`], name: 'Tesouro Transparente' }),
  tesouroIpca: (t) => ({ keys: [`tesouro.ipca.${t}`, 'bcb.ipca12m'], name: 'Tesouro Transparente e Banco Central (IPCA)' }),
  cdb: () => ({ keys: ['bcb.cdi'], name: 'Banco Central (CDI)' }),
  lciLca: () => ({ keys: ['bcb.cdi'], name: 'Banco Central (CDI)' }),
};

function sourceLines(view: InvestView, id: ProductId, term: number): ExplainLine[] {
  const src = SOURCES[id](term);
  const quotes = src.keys.map((k) => view.snapshot[k]).filter((x) => x !== undefined);
  const asOf = quotes.reduce<string | null>((m, x) => (m === null || x.asOf < m ? x.asOf : m), null);
  const stale = quotes.some((x) => x.stale);
  const lines: ExplainLine[] = [
    { label: 'Fonte e data', value: `${src.name}, dado de ${asOf ? brDate(asOf) : '—'}${stale ? ' (desatualizado)' : ''}` },
  ];
  if (id === 'tesouroSelic' || id === 'tesouroPre' || id === 'tesouroIpca') {
    lines.push({
      label: 'Hipótese do Tesouro',
      value: 'Título de referência com vencimento mais próximo do prazo; o cálculo carrega o título até o prazo, sem simular venda antecipada.',
    });
  }
  return lines;
}

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(2).replace('.', ',')}%`);

/** Conteúdo da tela "ver a conta". ref = fixed:{id} | plan. */
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
        ...sourceLines(view, id, r.term),
        { label: 'Aviso', value: 'Estimativa com a taxa de hoje. Não considera inflação futura nem risco de crédito.' },
      ],
    };
  }
  if (ref === 'plan') {
    const lines: ExplainLine[] = view.recommendation.plan.steps.map((s) => ({
      label: view.portfolio ? 'Mix ajustado à sua carteira' : 'Mix do perfil',
      value: formatBRL(s.amount, { cents: true }),
    }));
    return { title: 'Sugestão do mês', lines };
  }
  return null;
}
