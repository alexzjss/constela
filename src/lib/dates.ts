/** Datas como string local YYYY-MM-DD. Nunca usa new Date(string) nem toISOString. */
const pad = (n: number) => String(n).padStart(2, '0');

export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function fromBR(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

/** true se YYYY-MM-DD existe no calendário (rejeita 31/02). */
export function isRealDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return todayLocal(new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))) === d;
}

export function monthOf(d: string): string {
  return d.slice(0, 7);
}

export function dayOf(d: string): number {
  return Number(d.slice(8, 10));
}

export function prevMonth(m: string): string {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  return mo === 1 ? `${y - 1}-12` : `${y}-${pad(mo - 1)}`;
}

export function nextMonth(m: string): string {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  return mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
}

export function daysInMonth(m: string): number {
  return new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
}

export function addDays(d: string, n: number): string {
  const dt = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)) + n);
  return todayLocal(dt);
}

/** Dias de a até b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((ms(b) - ms(a)) / 86400000);
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function monthNamePt(m: string): string {
  return MONTHS[Number(m.slice(5, 7)) - 1];
}
