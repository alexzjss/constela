import type { Kind, Source, Transaction } from '../../src/domain/types';

let seq = 0;
export function tx(date: string, amount: number, kind: Kind, categoryId: string, source: Source = 'form'): Transaction {
  seq += 1;
  return {
    id: `t${seq}`, date, amount, kind, categoryId, description: '',
    source, externalId: null, needsReview: false, createdAt: date,
  };
}
