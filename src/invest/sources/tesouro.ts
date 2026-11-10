import type { CacheEntry, FetchFn } from '../cache';

const CSV_URL =
  'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv';

interface Row {
  title: string;
  maturity: string; // YYYY-MM-DD
  base: string; // YYYY-MM-DD
  rate: number; // decimal
}

const iso = (br: string) => {
  const [d, m, y] = br.split('/');
  return d && m && y ? `${y}-${m}-${d}` : '';
};

const dayNumber = (isoDate: string) => Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)) / 86_400_000;

function addMonths(isoDate: string, months: number): string {
  const total = +isoDate.slice(0, 4) * 12 + (+isoDate.slice(5, 7) - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}-${isoDate.slice(8, 10)}`;
}

/** Percorre o CSV uma vez e guarda só as linhas da Data Base mais recente. */
function latestRows(text: string): Row[] {
  let latest = '';
  let rows: Row[] = [];
  for (const line of text.split('\n')) {
    const c = line.trim().split(';');
    if (c.length < 4) continue;
    const base = iso(c[2]);
    const maturity = iso(c[1]);
    const rate = Number(c[3].replace(',', '.')) / 100;
    if (!base || !maturity || !Number.isFinite(rate)) continue;
    if (base > latest) {
      latest = base;
      rows = [];
    }
    if (base === latest) rows.push({ title: c[0], maturity, base, rate });
  }
  return rows;
}

function nearest(rows: Row[], title: string, target: string): Row | null {
  const t = dayNumber(target);
  let best: Row | null = null;
  for (const r of rows) {
    if (r.title !== title) continue;
    if (!best || Math.abs(dayNumber(r.maturity) - t) < Math.abs(dayNumber(best.maturity) - t)) best = r;
  }
  return best;
}

/** Taxas do Tesouro Direto: spread da Selic e taxas de Prefixado/IPCA+ por prazo. */
export async function fetchTesouro(fetchFn: FetchFn, now: Date): Promise<CacheEntry[]> {
  try {
    const res = await fetchFn(CSV_URL);
    if (!res.ok) return [];
    const rows = latestRows(await res.text());
    if (rows.length === 0) return [];
    const fetchedAt = now.toISOString();
    const out: CacheEntry[] = [];
    const add = (key: string, row: Row | null) => {
      if (row) out.push({ key, value: row.rate, asOf: row.base, fetchedAt });
    };
    const base = rows[0].base;
    add('tesouro.selicSpread', nearest(rows, 'Tesouro Selic', addMonths(base, 12)));
    for (const term of [6, 12, 24]) {
      add(`tesouro.pre.${term}`, nearest(rows, 'Tesouro Prefixado', addMonths(base, term)));
      add(`tesouro.ipca.${term}`, nearest(rows, 'Tesouro IPCA+', addMonths(base, term)));
    }
    return out;
  } catch {
    return [];
  }
}
