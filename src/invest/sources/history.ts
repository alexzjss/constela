import type { FetchFn } from '../cache';

export type SeriesPoint = [string, number]; // [YYYY-MM-DD, variação em %]

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Série histórica do Banco Central entre duas datas. null se a fonte falhar. */
export async function fetchSeries(
  fetchFn: FetchFn, code: number, from: string, to: string,
): Promise<SeriesPoint[] | null> {
  try {
    const res = await fetchFn(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${br(from)}&dataFinal=${br(to)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data: string; valor: string }[];
    if (!Array.isArray(body)) return null;
    const out: SeriesPoint[] = [];
    for (const p of body) {
      const [d, m, y] = String(p.data).split('/');
      const v = Number(p.valor);
      if (!d || !m || !y || !Number.isFinite(v)) return null;
      out.push([`${y}-${m}-${d}`, v]);
    }
    return out;
  } catch {
    return null;
  }
}
