import type { Holding, HoldingType } from '../../domain/types';
import type { Cents } from '../../lib/money';
import { classRange, PROFILE_MIX } from './allocation';
import { ASSET_CLASSES, type AssetClass, type Profile } from './types';

const CLASS_OF: Record<HoldingType, AssetClass | null> = {
  poupanca: 'rendaFixa', tesouro: 'rendaFixa', cdb: 'rendaFixa', lciLca: 'rendaFixa',
  fii: 'fii', acoes: 'acoesBr', exterior: 'exterior', cripto: 'cripto', outros: null,
};

export interface PortfolioRow {
  cls: AssetClass;
  value: Cents;
  pct: number; // parte atual da carteira, 0..100
  targetPct: number;
  range: { min: number; max: number } | null;
  status: 'abaixo' | 'dentro' | 'acima';
}

export interface PortfolioView {
  total: Cents;
  byClass: Record<AssetClass, Cents>;
  rows: PortfolioRow[];
}

/** Valor atual por classe de ativo. "Outros" não entra: não dá para saber a classe. */
export function portfolioByClass(holdings: Holding[]): Record<AssetClass, Cents> {
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, Cents>;
  for (const h of holdings) {
    const cls = CLASS_OF[h.type];
    if (cls) out[cls] += h.value;
  }
  return out;
}

/** Carteira atual contra a meta do perfil. null se não há nada classificável. */
export function buildPortfolio(holdings: Holding[], profile: Profile): PortfolioView | null {
  const byClass = portfolioByClass(holdings);
  const total = ASSET_CLASSES.reduce((a, c) => a + byClass[c], 0);
  if (total <= 0) return null;
  const rows = ASSET_CLASSES.map((cls): PortfolioRow => {
    const pct = (byClass[cls] / total) * 100;
    const targetPct = PROFILE_MIX[profile][cls];
    const range = classRange(targetPct);
    const status = range && pct < range.min ? 'abaixo' : pct > (range?.max ?? 0) ? 'acima' : 'dentro';
    return { cls, value: byClass[cls], pct, targetPct, range, status };
  });
  return { total, byClass, rows };
}
