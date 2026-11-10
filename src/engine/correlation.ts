/**
 * Correlação e risco a partir de séries de preço. Puro: sem rede, sem React.
 *
 * Tudo é medido em retornos SEMANAIS. Bolsas fecham em dias diferentes (feriados, fuso, cripto 24/7);
 * comparar dia a dia desalinha os papéis e puxa a correlação para baixo. Semana contra semana alinha.
 */

export type PricePoint = [string, number]; // [YYYY-MM-DD, preço de fechamento]
/** Retorno por semana, indexado pela segunda-feira da semana. */
export type Returns = Map<string, number>;

export const MIN_OBS = 26; // meio ano de semanas: abaixo disso o número engana
export const DEFAULT_WINDOW = 156; // três anos
export const WEEKS_PER_YEAR = 52;

const DAY = 86_400_000;
const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Segunda-feira da semana de `d`. */
export function weekKey(d: string): string {
  const ms = utc(d);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // segunda = 0
  return iso(ms - dow * DAY);
}

const prevWeek = (key: string) => iso(utc(key) - 7 * DAY);

/** Último fechamento de cada semana, em ordem. */
export function weeklyCloses(points: PricePoint[]): PricePoint[] {
  const last = new Map<string, number>();
  for (const [d, p] of [...points].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (Number.isFinite(p) && p > 0) last.set(weekKey(d), p);
  }
  return [...last.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/** Retorno de cada semana que tem a semana anterior ao lado (semana sem pregão não vira retorno de duas). */
export function weeklyReturns(points: PricePoint[]): Returns {
  const closes = weeklyCloses(points);
  const byWeek = new Map(closes);
  const out: Returns = new Map();
  for (const [week, close] of closes) {
    const before = byWeek.get(prevWeek(week));
    if (before !== undefined) out.set(week, close / before - 1);
  }
  return out;
}

/** Fica só com as últimas `weeks` semanas. */
export function lastWeeks(r: Returns, weeks: number): Returns {
  const keys = [...r.keys()].sort();
  return new Map(keys.slice(Math.max(0, keys.length - weeks)).map((k) => [k, r.get(k)!]));
}

/** Converte uma série em dólar para reais pelo câmbio da data (último câmbio conhecido até ela). */
export function toBrl(points: PricePoint[], fx: PricePoint[]): PricePoint[] {
  const rates = [...fx].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const out: PricePoint[] = [];
  let j = -1;
  for (const [d, p] of [...points].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    while (j + 1 < rates.length && rates[j + 1][0] <= d) j += 1;
    if (j >= 0) out.push([d, p * rates[j][1]]);
  }
  return out;
}

export function align(a: Returns, b: Returns): { x: number[]; y: number[]; weeks: string[] } {
  const weeks = [...a.keys()].filter((k) => b.has(k)).sort();
  return { weeks, x: weeks.map((k) => a.get(k)!), y: weeks.map((k) => b.get(k)!) };
}

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

function stats(x: number[], y: number[]) {
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < x.length; i++) {
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  return { sxx, syy, sxy, n: x.length };
}

export interface Pair {
  correlation: number | null;
  obs: number;
}

/** Pearson entre os retornos das semanas em comum. null com poucas semanas ou sem variação. */
export function correlation(a: Returns, b: Returns): Pair {
  const { x, y } = align(a, b);
  if (x.length < MIN_OBS) return { correlation: null, obs: x.length };
  const s = stats(x, y);
  if (s.sxx === 0 || s.syy === 0) return { correlation: null, obs: x.length };
  return { correlation: s.sxy / Math.sqrt(s.sxx * s.syy), obs: x.length };
}

/** Beta do ativo contra o índice: quanto o ativo anda, em média, para cada 1% do índice. */
export function beta(asset: Returns, index: Returns): { beta: number | null; obs: number } {
  const { x, y } = align(asset, index);
  if (x.length < MIN_OBS) return { beta: null, obs: x.length };
  const s = stats(x, y);
  return { beta: s.syy === 0 ? null : s.sxy / s.syy, obs: x.length };
}

/** Volatilidade anualizada (desvio-padrão dos retornos semanais × √52). */
export function annualVolatility(r: Returns | number[]): number | null {
  const v = Array.isArray(r) ? r : [...r.values()];
  if (v.length < MIN_OBS) return null;
  const m = mean(v);
  const variance = v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variance) * Math.sqrt(WEEKS_PER_YEAR);
}

/** Maior queda do pico ao fundo, em fração negativa (-0,3 = caiu 30%). */
export function maxDrawdown(points: PricePoint[]): number | null {
  const closes = weeklyCloses(points);
  if (closes.length < 2) return null;
  let peak = closes[0][1];
  let worst = 0;
  for (const [, p] of closes) {
    peak = Math.max(peak, p);
    worst = Math.min(worst, p / peak - 1);
  }
  return worst;
}

/** Quanto o preço variou desde `from` (ou desde o começo da série). */
export function totalReturn(points: PricePoint[], from?: string): number | null {
  const s = [...points].sort((a, b) => (a[0] < b[0] ? -1 : 1)).filter((p) => !from || p[0] >= from);
  return s.length >= 2 ? s[s.length - 1][1] / s[0][1] - 1 : null;
}

export interface Labeled {
  id: string;
  returns: Returns;
}

export interface Matrix {
  ids: string[];
  values: (number | null)[][];
}

/** Matriz de correlação entre todos os pares (diagonal = 1). */
export function correlationMatrix(items: Labeled[]): Matrix {
  const values = items.map((a, i) =>
    items.map((b, j) => (i === j ? 1 : correlation(a.returns, b.returns).correlation)),
  );
  return { ids: items.map((i) => i.id), values };
}

export interface Ranked {
  id: string;
  correlation: number;
  obs: number;
}

/** Os mais parecidos com `target` (correlação mais alta primeiro). */
export function mostSimilar(target: Returns, universe: Labeled[], limit = 5): Ranked[] {
  return rank(target, universe).sort((a, b) => b.correlation - a.correlation).slice(0, limit);
}

/** Os que mais diversificam: correlação mais baixa primeiro. */
export function mostDiversifying(target: Returns, universe: Labeled[], limit = 5): Ranked[] {
  return rank(target, universe).sort((a, b) => a.correlation - b.correlation).slice(0, limit);
}

function rank(target: Returns, universe: Labeled[]): Ranked[] {
  const out: Ranked[] = [];
  for (const u of universe) {
    const c = correlation(target, u.returns);
    if (c.correlation !== null) out.push({ id: u.id, correlation: c.correlation, obs: c.obs });
  }
  return out;
}

export interface Weighted extends Labeled {
  weight: number; // proporção da carteira, qualquer escala (é normalizada aqui)
}

/** Retorno semanal da carteira ponderada, nas semanas em que todas as posições têm dado. */
export function portfolioReturns(items: Weighted[]): Returns {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const out: Returns = new Map();
  if (items.length === 0 || total <= 0) return out;
  const [first, ...rest] = items;
  for (const week of first.returns.keys()) {
    if (!rest.every((i) => i.returns.has(week))) continue;
    out.set(week, items.reduce((s, i) => s + (i.weight / total) * i.returns.get(week)!, 0));
  }
  return out;
}

export interface Impact {
  /** Correlação do ativo com a carteira atual. */
  correlation: number | null;
  volBefore: number | null;
  volAfter: number | null;
  /** volAfter − volBefore: negativo = o ativo reduz o risco da carteira. */
  volChange: number | null;
  obs: number;
  addWeight: number;
}

/**
 * O que acontece com o risco da carteira se `addWeight` dela (0..1) passar a ser o candidato.
 * Um ativo pouco correlacionado costuma reduzir a volatilidade mesmo sendo arriscado sozinho.
 */
export function portfolioImpact(candidate: Returns, holdings: Weighted[], addWeight: number): Impact {
  const port = portfolioReturns(holdings);
  const { x, y, weeks } = align(port, candidate);
  const base: Impact = { correlation: null, volBefore: null, volAfter: null, volChange: null, obs: x.length, addWeight };
  if (x.length < MIN_OBS) return base;
  const c = correlation(port, candidate).correlation;
  const w = Math.min(1, Math.max(0, addWeight));
  const mixed = weeks.map((_, i) => (1 - w) * x[i] + w * y[i]);
  const before = annualVolatility(x);
  const after = annualVolatility(mixed);
  return {
    ...base, correlation: c, volBefore: before, volAfter: after,
    volChange: before !== null && after !== null ? after - before : null,
  };
}

export type CorrelationBand = 'quase-igual' | 'parecido' | 'independente' | 'oposto';

export function bandOf(c: number): CorrelationBand {
  if (c >= 0.7) return 'quase-igual';
  if (c >= 0.4) return 'parecido';
  if (c > -0.2) return 'independente';
  return 'oposto';
}

export const BAND_LABEL: Record<CorrelationBand, string> = {
  'quase-igual': 'andam quase juntos',
  parecido: 'andam parecido',
  independente: 'pouco relacionados',
  oposto: 'tendem a andar em sentidos opostos',
};
