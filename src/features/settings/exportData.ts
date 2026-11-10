import { categoryById } from '../../domain/categories';
import type { Transaction } from '../../domain/types';
import { formatBRL } from '../../lib/money';

const TIPO: Record<Transaction['kind'], string> = { expense: 'gasto', income: 'ganho', internal: 'interno' };

const field = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function toCsv(txs: Transaction[]): string {
  const lines = txs.map((t) => {
    const valor = formatBRL(t.amount, { cents: true }).replace('R$ ', '');
    return [t.date, field(valor), TIPO[t.kind], categoryById(t.categoryId).name, field(t.description)].join(',');
  });
  return ['data,valor,tipo,categoria,descricao', ...lines].join('\n') + '\n';
}
