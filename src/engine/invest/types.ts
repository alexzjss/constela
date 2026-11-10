export type Profile = 'conservador' | 'moderado' | 'arrojado';
export type Term = 6 | 12 | 24;
export type AssetClass = 'rendaFixa' | 'fii' | 'acoesBr' | 'exterior' | 'cripto';
export type ProductId = 'poupanca' | 'tesouroSelic' | 'tesouroPre' | 'tesouroIpca' | 'cdb' | 'lciLca';

export const TERMS: Term[] = [6, 12, 24];
export const ASSET_CLASSES: AssetClass[] = ['rendaFixa', 'fii', 'acoesBr', 'exterior', 'cripto'];

/** Taxas anuais em decimal (0,1475 = 14,75% a.a.). null = sem dado. */
export interface Rates {
  selic: number | null;
  cdi: number | null;
  ipca12m: number | null;
  tr: number | null;
  tesouroSelicSpread: number | null;
  tesouroPre: Record<Term, number | null>;
  tesouroIpca: Record<Term, number | null>;
}

export interface Hypotheses {
  cdbPctCdi: number;
  lciPctCdi: number;
  custodyPct: number;
}

export const DEFAULT_HYPOTHESES: Hypotheses = { cdbPctCdi: 1, lciPctCdi: 0.9, custodyPct: 0.002 };

export interface ExplainLine {
  label: string;
  value: string;
}

export const EMPTY_RATES: Rates = {
  selic: null, cdi: null, ipca12m: null, tr: null, tesouroSelicSpread: null,
  tesouroPre: { 6: null, 12: null, 24: null },
  tesouroIpca: { 6: null, 12: null, 24: null },
};
