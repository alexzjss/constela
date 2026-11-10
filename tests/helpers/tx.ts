import type { Kind, Transaction } from '../../src/domain/types';

let seq = 0;
export function tx(date: string, amount: number, kind: Kind, categoryId: string): Transaction {
  seq += 1;
  return {
    id: `t${seq}`, date, amount, kind, categoryId, description: '',
    source: 'form', externalId: null, needsReview: false, createdAt: date,
  };
}
