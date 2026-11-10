import type { AssetClass } from '../../engine/invest/types';
import type { FetchFn } from '../cache';

export interface SearchHit {
  symbol: string;
  name: string;
  /** Tipo cru do Yahoo (EQUITY, ETF, CRYPTOCURRENCY, INDEX...). */
  kind: string;
  exchange: string;
  cls: Exclude<AssetClass, 'rendaFixa'>;
}

interface RawQuote {
  symbol?: unknown;
  shortname?: unknown;
  longname?: unknown;
  quoteType?: unknown;
  exchDisp?: unknown;
  isYahooFinance?: unknown;
}

const ETF_EXTERIOR = /^(IVVB|SPXI|NASD|WRLD|ACWI|XINA|EURP|USTK|TECK)/;
const ETF_CRIPTO = /^(HASH|QBTC|ETHE|BITH|QETH)/;

/** Classe do app para um símbolo do Yahoo. FII na B3 é cota com final 11 que não é ETF. */
export function classOf(symbol: string, kind: string): Exclude<AssetClass, 'rendaFixa'> {
  if (kind === 'CRYPTOCURRENCY') return 'cripto';
  if (!symbol.endsWith('.SA')) return 'exterior';
  const ticker = symbol.slice(0, -3);
  if (kind === 'ETF') return ETF_CRIPTO.test(ticker) ? 'cripto' : ETF_EXTERIOR.test(ticker) ? 'exterior' : 'acoesBr';
  return /^[A-Z]{4}11$/.test(ticker) ? 'fii' : 'acoesBr';
}

const SUPPORTED = new Set(['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'MUTUALFUND', 'INDEX']);

/** Busca livre por ticker ou nome. Lista vazia se a fonte falhar. */
export async function searchSymbols(fetchFn: FetchFn, query: string, limit = 12): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetchFn(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0&lang=pt-BR&region=BR`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) return [];
    const quotes = ((await res.json()) as { quotes?: RawQuote[] }).quotes ?? [];
    const out: SearchHit[] = [];
    for (const r of quotes) {
      if (typeof r.symbol !== 'string' || typeof r.quoteType !== 'string' || !SUPPORTED.has(r.quoteType)) continue;
      const name = typeof r.longname === 'string' ? r.longname : typeof r.shortname === 'string' ? r.shortname : r.symbol;
      out.push({
        symbol: r.symbol, name, kind: r.quoteType,
        exchange: typeof r.exchDisp === 'string' ? r.exchDisp : '',
        cls: classOf(r.symbol, r.quoteType),
      });
    }
    return out;
  } catch {
    return [];
  }
}
