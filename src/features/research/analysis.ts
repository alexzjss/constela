import {
  DEFAULT_WINDOW, MIN_OBS, annualVolatility, bandOf, beta, correlation, lastWeeks, maxDrawdown,
  mostDiversifying, mostSimilar, portfolioImpact, toBrl, totalReturn, weeklyReturns,
  type Impact, type PricePoint, type Ranked, type Returns,
} from '../../engine/correlation';

export interface AssetSeries {
  symbol: string;
  name: string;
  currency: string;
  points: PricePoint[];
}

export interface Reference {
  symbol: string;
  label: string;
  points: PricePoint[];
  currency: string;
}

export interface HeldAsset {
  series: AssetSeries;
  value: number; // centavos, vale como peso na carteira
}

export interface AnalysisInput {
  target: AssetSeries;
  /** Dólar em reais (USDBRL=X). Sem ele, ativos em dólar ficam sem correlação em reais. */
  fx: PricePoint[] | null;
  references: Reference[];
  universe: AssetSeries[];
  held: HeldAsset[];
  windowWeeks?: number;
  /** Fatia da carteira que o ativo ocuparia na simulação (0..1). */
  addWeight?: number;
  /** Retorno do CDI no último ano, em fração, para comparar. */
  cdi12m?: number | null;
}

export interface IndicatorRow {
  label: string;
  symbol: string;
  correlation: number | null;
  beta: number | null;
  obs: number;
}

export interface Analysis {
  symbol: string;
  name: string;
  currency: string;
  weeks: number;
  change12m: number | null;
  vsCdi12m: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  indicators: IndicatorRow[];
  similar: (Ranked & { name: string })[];
  diversifiers: (Ranked & { name: string })[];
  impact: Impact | null;
  insights: string[];
  /** Falta moeda ou dado para comparar em reais. */
  warnings: string[];
}

/** Série em reais; null se está em outra moeda e não há câmbio. Só o dólar é convertido. */
export function inBrl(s: { currency: string; points: PricePoint[] }, fx: PricePoint[] | null): PricePoint[] | null {
  if (s.currency === 'BRL') return s.points;
  if (s.currency === 'USD') return fx && fx.length ? toBrl(s.points, fx) : null;
  return null;
}

const returnsOf = (s: { currency: string; points: PricePoint[] }, fx: PricePoint[] | null, weeks: number): Returns | null => {
  const p = inBrl(s, fx);
  return p ? lastWeeks(weeklyReturns(p), weeks) : null;
};

const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits).replace('.', ',')}%`;
const dec = (x: number) => x.toFixed(2).replace('.', ',');

function yearAgo(points: PricePoint[]): string | undefined {
  const last = points[points.length - 1]?.[0];
  if (!last) return undefined;
  return `${Number(last.slice(0, 4)) - 1}${last.slice(4)}`;
}

export function analyze(input: AnalysisInput): Analysis {
  const weeks = input.windowWeeks ?? DEFAULT_WINDOW;
  const { target, fx } = input;
  const warnings: string[] = [];
  const sorted = [...target.points].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const brl = inBrl({ currency: target.currency, points: sorted }, fx);
  if (!brl) warnings.push(`Sem câmbio para converter ${target.currency} em reais: correlações indisponíveis.`);

  const own = brl ? lastWeeks(weeklyReturns(brl), weeks) : null;

  const change12m = brl ? totalReturn(brl, yearAgo(brl)) : null;
  const vsCdi12m = change12m !== null && input.cdi12m != null ? change12m - input.cdi12m : null;

  const indicators: IndicatorRow[] = input.references.map((ref) => {
    const r = own ? returnsOf(ref, fx, weeks) : null;
    const c = own && r ? correlation(own, r) : { correlation: null, obs: 0 };
    return {
      label: ref.label, symbol: ref.symbol, correlation: c.correlation,
      beta: own && r ? beta(own, r).beta : null, obs: c.obs,
    };
  });

  const labeled = (list: AssetSeries[]) =>
    list.filter((u) => u.symbol !== target.symbol)
      .map((u) => ({ id: u.symbol, name: u.name, returns: returnsOf(u, fx, weeks) }))
      .filter((u): u is { id: string; name: string; returns: Returns } => u.returns !== null);
  const universe = labeled(input.universe);
  const nameOf = new Map(universe.map((u) => [u.id, u.name]));
  const withName = (r: Ranked) => ({ ...r, name: nameOf.get(r.id) ?? r.id });
  const similar = own ? mostSimilar(own, universe, 5).map(withName) : [];
  const diversifiers = own ? mostDiversifying(own, universe, 5).map(withName) : [];

  const heldReturns = input.held
    .filter((h) => h.series.symbol !== target.symbol && h.value > 0)
    .map((h) => ({ id: h.series.symbol, returns: returnsOf(h.series, fx, weeks), weight: h.value }))
    .filter((h): h is { id: string; returns: Returns; weight: number } => h.returns !== null);
  const impact = own && heldReturns.length > 0 ? portfolioImpact(own, heldReturns, input.addWeight ?? 0.1) : null;

  const volatility = own ? annualVolatility(own) : null;
  const dd = brl ? maxDrawdown(brl) : null;
  const result: Analysis = {
    symbol: target.symbol, name: target.name, currency: target.currency, weeks: own?.size ?? 0,
    change12m, vsCdi12m, volatility, maxDrawdown: dd, indicators, similar, diversifiers, impact,
    insights: [], warnings,
  };
  result.insights = insightsFor(result);
  return result;
}

/** Frases de leitura, só a partir dos números acima. Nada de "compre"/"venda". */
export function insightsFor(a: Analysis): string[] {
  const out: string[] = [];
  if (a.weeks > 0 && a.weeks < MIN_OBS) {
    out.push(`Só ${a.weeks} semanas de histórico: as correlações ainda são pouco confiáveis.`);
  }
  const i = a.impact;
  if (i && i.correlation !== null) {
    const band = bandOf(i.correlation);
    if (band === 'quase-igual') {
      out.push(`Anda quase junto com a sua carteira (correlação ${dec(i.correlation)}): colocar mais dele concentra risco em vez de diversificar.`);
    } else if (band === 'oposto' || band === 'independente') {
      out.push(`Tem pouca relação com a sua carteira (correlação ${dec(i.correlation)}): costuma ajudar a diversificar.`);
    } else {
      out.push(`Anda parecido com a sua carteira (correlação ${dec(i.correlation)}): diversifica pouco.`);
    }
    if (i.volBefore !== null && i.volAfter !== null) {
      const verb = i.volAfter < i.volBefore ? 'reduziria' : 'aumentaria';
      out.push(`Com ${pct(i.addWeight)} da carteira nele, a volatilidade estimada ${verb} de ${pct(i.volBefore, 1)} para ${pct(i.volAfter, 1)} ao ano.`);
    }
  }
  if (a.volatility !== null) {
    if (a.volatility >= 0.4) out.push(`Volatilidade alta: ${pct(a.volatility)} ao ano. Preço sobe e cai bastante.`);
    else if (a.volatility <= 0.15) out.push(`Volatilidade baixa: ${pct(a.volatility)} ao ano.`);
  }
  if (a.maxDrawdown !== null && a.maxDrawdown <= -0.3) {
    out.push(`Na janela analisada já chegou a cair ${pct(-a.maxDrawdown)} do pico ao fundo.`);
  }
  const fx = a.indicators.find((x) => x.symbol === 'USDBRL=X');
  if (fx?.correlation != null && Math.abs(fx.correlation) >= 0.4) {
    out.push(`Sensível ao dólar (correlação ${dec(fx.correlation)}).`);
  }
  if (a.vsCdi12m !== null) {
    out.push(`Em 12 meses ficou ${pct(Math.abs(a.vsCdi12m), 1)} ${a.vsCdi12m >= 0 ? 'acima' : 'abaixo'} do CDI. Rentabilidade passada não garante futura.`);
  }
  return out;
}

export interface Candidate {
  series: AssetSeries;
  cls: string;
}

export interface Suggestion {
  symbol: string;
  name: string;
  correlation: number;
  volBefore: number;
  volAfter: number;
  volChange: number;
}

/**
 * Entre os candidatos, os que mais reduzem a volatilidade da carteira se receberem `addWeight` dela.
 * Só considera candidatos com histórico suficiente e que o usuário ainda não tem.
 */
export function suggestDiversifiers(
  held: HeldAsset[], candidates: AssetSeries[], fx: PricePoint[] | null,
  opts: { limit?: number; addWeight?: number; windowWeeks?: number } = {},
): Suggestion[] {
  const weeks = opts.windowWeeks ?? DEFAULT_WINDOW;
  const owned = new Set(held.map((h) => h.series.symbol));
  const base = held
    .map((h) => ({ id: h.series.symbol, returns: returnsOf(h.series, fx, weeks), weight: h.value }))
    .filter((h): h is { id: string; returns: Returns; weight: number } => h.returns !== null && h.weight > 0);
  if (base.length === 0) return [];
  const out: Suggestion[] = [];
  for (const c of candidates) {
    if (owned.has(c.symbol)) continue;
    const r = returnsOf(c, fx, weeks);
    if (!r) continue;
    const imp = portfolioImpact(r, base, opts.addWeight ?? 0.1);
    if (imp.correlation === null || imp.volBefore === null || imp.volAfter === null || imp.volChange === null) continue;
    out.push({
      symbol: c.symbol, name: c.name, correlation: imp.correlation,
      volBefore: imp.volBefore, volAfter: imp.volAfter, volChange: imp.volChange,
    });
  }
  return out.sort((a, b) => a.volChange - b.volChange).slice(0, opts.limit ?? 5);
}
