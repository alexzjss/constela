import type { AssetClass } from '../engine/invest/types';

export interface CuratedAsset {
  symbol: string; // símbolo no Yahoo
  name: string;
  cls: Exclude<AssetClass, 'rendaFixa'>;
  currency: 'BRL' | 'USD';
}

/** Grandes e líquidos. Indicadores informativos, não recomendação de compra. */
export const CURATED_ASSETS: CuratedAsset[] = [
  { symbol: 'BOVA11.SA', name: 'BOVA11 (Ibovespa)', cls: 'acoesBr', currency: 'BRL' },
  { symbol: 'ITUB4.SA', name: 'ITUB4 (Itaú)', cls: 'acoesBr', currency: 'BRL' },
  { symbol: 'PETR4.SA', name: 'PETR4 (Petrobras)', cls: 'acoesBr', currency: 'BRL' },
  { symbol: 'WEGE3.SA', name: 'WEGE3 (WEG)', cls: 'acoesBr', currency: 'BRL' },
  { symbol: 'KNRI11.SA', name: 'KNRI11 (FII tijolo)', cls: 'fii', currency: 'BRL' },
  { symbol: 'HGLG11.SA', name: 'HGLG11 (FII logística)', cls: 'fii', currency: 'BRL' },
  { symbol: 'KNCR11.SA', name: 'KNCR11 (FII papel)', cls: 'fii', currency: 'BRL' },
  { symbol: 'MXRF11.SA', name: 'MXRF11 (FII papel)', cls: 'fii', currency: 'BRL' },
  { symbol: 'IVVB11.SA', name: 'IVVB11 (S&P 500 em reais)', cls: 'exterior', currency: 'BRL' },
  { symbol: 'VOO', name: 'VOO (S&P 500)', cls: 'exterior', currency: 'USD' },
  { symbol: 'VT', name: 'VT (mundo)', cls: 'exterior', currency: 'USD' },
  { symbol: 'BTC-USD', name: 'Bitcoin', cls: 'cripto', currency: 'USD' },
  { symbol: 'ETH-USD', name: 'Ethereum', cls: 'cripto', currency: 'USD' },
];
