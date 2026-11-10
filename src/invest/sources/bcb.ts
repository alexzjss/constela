import type { CacheEntry, FetchFn } from '../cache';

interface Point {
  data: string; // dd/MM/yyyy
  valor: string;
}

const url = (code: number, n: number) =>
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${n}?formato=json`;

async function series(fetchFn: FetchFn, code: number, n: number): Promise<{ values: number[]; asOf: string } | null> {
  try {
    const res = await fetchFn(url(code, n));
    if (!res.ok) return null;
    const body = (await res.json()) as Point[];
    if (!Array.isArray(body) || body.length === 0) return null;
    const values = body.map((p) => Number(p.valor));
    if (values.some((v) => !Number.isFinite(v))) return null;
    const [d, m, y] = body[body.length - 1].data.split('/');
    if (!d || !m || !y) return null;
    return { values, asOf: `${y}-${m}-${d}` };
  } catch {
    return null;
  }
}

/** Selic, CDI, IPCA 12 meses e TR (taxas anuais em decimal). Cada série falha sozinha. */
export async function fetchBcb(fetchFn: FetchFn, now: Date): Promise<CacheEntry[]> {
  const fetchedAt = now.toISOString();
  const out: CacheEntry[] = [];
  const push = (key: string, value: number, asOf: string) => out.push({ key, value, asOf, fetchedAt });

  const [selic, cdi, ipca, tr] = await Promise.all([
    series(fetchFn, 432, 1),
    series(fetchFn, 4389, 1),
    series(fetchFn, 433, 12),
    series(fetchFn, 226, 1),
  ]);
  if (selic) push('bcb.selic', selic.values[0] / 100, selic.asOf);
  if (cdi) push('bcb.cdi', cdi.values[0] / 100, cdi.asOf);
  if (ipca && ipca.values.length === 12) {
    push('bcb.ipca12m', ipca.values.reduce((acc, v) => acc * (1 + v / 100), 1) - 1, ipca.asOf);
  }
  if (tr) push('bcb.tr', (1 + tr.values[0] / 100) ** 12 - 1, tr.asOf);
  return out;
}
