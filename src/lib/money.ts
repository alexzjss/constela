export type Cents = number;

/** "R$ 1.200,50" | "35,90" | "-16.80" | "1.200" -> centavos. null se não for número. */
export function parseBRL(text: string): Cents | null {
  let s = text.replace(/R\$/gi, '').replace(/\s/g, '');
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  let intPart: string;
  let decPart = '';
  if (s.includes(',')) {
    const i = s.lastIndexOf(',');
    intPart = s.slice(0, i).replace(/\./g, '');
    decPart = s.slice(i + 1);
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    [intPart, decPart] = s.split('.');
  } else {
    intPart = s.replace(/\./g, '');
  }
  if (!/^\d*$/.test(intPart) || !/^\d{0,2}$/.test(decPart)) return null;
  const cents = Number(intPart || '0') * 100 + Number(decPart.padEnd(2, '0') || '0');
  return neg ? -cents : cents;
}

export function formatBRL(c: Cents, opts: { cents?: boolean } = {}): string {
  const abs = Math.abs(c);
  const reais = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  const int = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const body = opts.cents ? `${int},${rest}` : int;
  return `${c < 0 ? '-' : ''}R$ ${body}`;
}
