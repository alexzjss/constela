/** 0,1234 -> "12%" (digits=0) ou "12,3%" (digits=1). */
export const pctText = (x: number | null, digits = 0): string =>
  x === null ? '—' : `${(x * 100).toFixed(digits).replace('.', ',')}%`;

/** Com sinal: +12,3% / −4,0%. */
export const signedPct = (x: number | null, digits = 1): string =>
  x === null ? '—' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(digits).replace('.', ',')}%`;

export const num2 = (x: number | null): string => (x === null ? '—' : x.toFixed(2).replace('.', ','));
