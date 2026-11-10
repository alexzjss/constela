import {
  annualVolatility, beta, correlation, correlationMatrix, lastWeeks, maxDrawdown, mostDiversifying, mostSimilar,
  portfolioImpact, portfolioReturns, toBrl, totalReturn, weekKey, weeklyCloses, weeklyReturns, bandOf,
  type PricePoint, type Returns,
} from '../../src/engine/correlation';

const MON = '2024-01-01'; // segunda-feira
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

/** Série semanal a partir de retornos, começando em 100. */
function fromReturns(rets: number[]): PricePoint[] {
  let p = 100;
  const out: PricePoint[] = [[MON, p]];
  rets.forEach((r, i) => {
    p *= 1 + r;
    out.push([addDays(MON, 7 * (i + 1)), p]);
  });
  return out;
}

// Pseudoaleatório determinístico (sem Math.random nos testes)
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5) / 10;
}
const noise = (n: number, seed: number) => Array.from({ length: n }, lcg(seed));

const N = 80;
const A = noise(N, 1);
const B = noise(N, 2);

test('weekKey devolve a segunda-feira', () => {
  expect(weekKey('2024-01-01')).toBe('2024-01-01');
  expect(weekKey('2024-01-07')).toBe('2024-01-01'); // domingo
  expect(weekKey('2024-01-03')).toBe('2024-01-01');
  expect(weekKey('2024-01-08')).toBe('2024-01-08');
});

test('weeklyCloses fica com o último fechamento da semana', () => {
  const c = weeklyCloses([['2024-01-02', 10], ['2024-01-05', 12], ['2024-01-09', 13]]);
  expect(c).toEqual([['2024-01-01', 12], ['2024-01-08', 13]]);
});

test('semana sem dado não vira retorno de duas semanas', () => {
  const r = weeklyReturns([['2024-01-01', 100], ['2024-01-08', 110], ['2024-01-22', 121]]);
  expect([...r.keys()]).toEqual(['2024-01-08']);
  expect(r.get('2024-01-08')).toBeCloseTo(0.1, 10);
});

test('correlação 1 com ele mesmo, -1 com o espelho, ~0 com ruído independente', () => {
  const a = weeklyReturns(fromReturns(A));
  expect(correlation(a, a).correlation).toBeCloseTo(1, 10);
  expect(correlation(a, weeklyReturns(fromReturns(A.map((x) => -x)))).correlation).toBeCloseTo(-1, 10);
  const indep = correlation(a, weeklyReturns(fromReturns(B)));
  expect(Math.abs(indep.correlation!)).toBeLessThan(0.3);
  expect(indep.obs).toBe(N);
});

test('poucas semanas ou série constante dão null', () => {
  const short = weeklyReturns(fromReturns(A.slice(0, 10)));
  expect(correlation(short, short).correlation).toBeNull();
  const flat = weeklyReturns(fromReturns(Array(N).fill(0)));
  expect(correlation(flat, weeklyReturns(fromReturns(A))).correlation).toBeNull();
});

test('beta de um ativo que anda o dobro do índice é 2', () => {
  const idx = weeklyReturns(fromReturns(A));
  const asset: Returns = new Map([...idx].map(([k, v]) => [k, 2 * v]));
  expect(beta(asset, idx).beta).toBeCloseTo(2, 10);
});

test('volatilidade anualizada', () => {
  const v = annualVolatility(A)!;
  const m = A.reduce((s, x) => s + x, 0) / A.length;
  const sd = Math.sqrt(A.reduce((s, x) => s + (x - m) ** 2, 0) / (A.length - 1));
  expect(v).toBeCloseTo(sd * Math.sqrt(52), 10);
  expect(annualVolatility([0.1, 0.2])).toBeNull();
});

test('maxDrawdown e totalReturn', () => {
  const pts: PricePoint[] = [['2024-01-01', 100], ['2024-01-08', 200], ['2024-01-15', 100], ['2024-01-22', 150]];
  expect(maxDrawdown(pts)).toBeCloseTo(-0.5, 10);
  expect(totalReturn(pts)).toBeCloseTo(0.5, 10);
  expect(totalReturn(pts, '2024-01-08')).toBeCloseTo(-0.25, 10);
  expect(totalReturn([['2024-01-01', 1]])).toBeNull();
});

test('toBrl usa o último câmbio conhecido e descarta pontos sem câmbio', () => {
  const out = toBrl([['2024-01-01', 10], ['2024-01-03', 10], ['2024-01-06', 10]], [['2024-01-02', 5], ['2024-01-05', 6]]);
  expect(out).toEqual([['2024-01-03', 50], ['2024-01-06', 60]]);
});

test('lastWeeks corta a janela', () => {
  const r = weeklyReturns(fromReturns(A));
  const w = lastWeeks(r, 30);
  expect(w.size).toBe(30);
  expect([...w.keys()].sort()[29]).toBe([...r.keys()].sort()[N - 1]);
});

test('matriz tem diagonal 1 e é simétrica', () => {
  const items = [A, B, A.map((x) => x + 0.001)].map((r, i) => ({ id: `s${i}`, returns: weeklyReturns(fromReturns(r)) }));
  const m = correlationMatrix(items);
  expect(m.values[0][0]).toBe(1);
  expect(m.values[0][1]).toBeCloseTo(m.values[1][0]!, 12);
  expect(m.values[0][2]).toBeGreaterThan(0.99);
});

test('mais parecidos e mais diversificadores', () => {
  const target = weeklyReturns(fromReturns(A));
  const u = [
    { id: 'gêmeo', returns: weeklyReturns(fromReturns(A.map((x) => x * 1.1))) },
    { id: 'espelho', returns: weeklyReturns(fromReturns(A.map((x) => -x))) },
    { id: 'ruído', returns: weeklyReturns(fromReturns(B)) },
  ];
  expect(mostSimilar(target, u, 1)[0].id).toBe('gêmeo');
  expect(mostDiversifying(target, u, 1)[0].id).toBe('espelho');
});

test('carteira ponderada e impacto: espelho reduz o risco, clone não', () => {
  const a = weeklyReturns(fromReturns(A));
  const hold = [{ id: 'a', returns: a, weight: 3 }];
  expect(portfolioReturns(hold).get([...a.keys()][0])).toBeCloseTo(a.get([...a.keys()][0])!, 12);

  const mirror = weeklyReturns(fromReturns(A.map((x) => -x)));
  const hedge = portfolioImpact(mirror, hold, 0.5);
  expect(hedge.correlation).toBeCloseTo(-1, 6);
  expect(hedge.volChange!).toBeLessThan(0);
  expect(hedge.volAfter!).toBeLessThan(1e-9);

  const clone = portfolioImpact(a, hold, 0.5);
  expect(clone.volChange!).toBeCloseTo(0, 10);
});

test('impacto sem dados suficientes devolve null', () => {
  const short = weeklyReturns(fromReturns(A.slice(0, 5)));
  expect(portfolioImpact(short, [{ id: 'a', returns: short, weight: 1 }], 0.1).correlation).toBeNull();
  expect(portfolioReturns([]).size).toBe(0);
});

test('faixas de correlação', () => {
  expect([0.9, 0.5, 0, -0.5].map(bandOf)).toEqual(['quase-igual', 'parecido', 'independente', 'oposto']);
});
