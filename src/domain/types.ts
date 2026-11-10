export type HoldingType =
  | 'poupanca' | 'tesouro' | 'cdb' | 'lciLca' | 'fii' | 'acoes' | 'exterior' | 'cripto' | 'outros';

/** Uma posição investida: quanto entrou (invested) e quanto vale hoje (value). */
export interface Holding {
  id: string;
  type: HoldingType;
  name: string;
  invested: number; // centavos
  value: number; // centavos
  updatedAt: string; // YYYY-MM-DD
  /** Símbolo do ativo na pesquisa (ex.: PETR4.SA). Liga a posição às correlações; null = só manual. */
  symbol?: string | null;
}

/** Entrada ou saída de dinheiro de uma posição, com data: base para comparar o rendimento no tempo. */
export interface HoldingMove {
  id: string;
  holdingId: string;
  date: string; // YYYY-MM-DD
  kind: 'aporte' | 'resgate';
  amount: number; // centavos, > 0
}
