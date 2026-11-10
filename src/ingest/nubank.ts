import type { Transaction } from '../domain/types';
import { fromBR } from '../lib/dates';
import { parseBRL } from '../lib/money';
import { categorizeMerchant } from '../parser/merchants';

export type ImportedRow = Omit<Transaction, 'id' | 'createdAt'>;

export class NubankFormatError extends Error {
  constructor() {
    super('Esse arquivo não é um extrato do Nubank.');
    this.name = 'NubankFormatError';
  }
}

/** CSV mínimo com aspas e BOM. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

/** Mantém só "Tipo - contraparte"; remove CPF mascarado, banco, agência e conta. */
export function sanitizeDescription(desc: string): string {
  const parts = desc.split(' - ').map((p) => p.trim());
  const second = parts[1];
  const sensitive = !second || /•|\d{3}\.\d{3}|\(\d{4}\)|Ag[eê]ncia/i.test(second);
  return sensitive ? parts[0] : `${parts[0]} - ${second}`;
}

type Rule = { kind: ImportedRow['kind']; category: string | ((who: string) => string) };

const RULES: [string, Rule][] = [
  ['Compra no débito', { kind: 'expense', category: (w) => w }],
  ['Transferência enviada pelo Pix', { kind: 'expense', category: 'outros' }],
  ['Débito em conta', { kind: 'expense', category: 'contas' }],
  ['Pagamento de fatura', { kind: 'expense', category: 'cartao' }],
  ['Transferência recebida pelo Pix', { kind: 'income', category: 'renda' }],
  ['Transferência Recebida', { kind: 'income', category: 'renda' }],
  ['Depósito Recebido por Boleto', { kind: 'income', category: 'renda' }],
  ['Reembolso recebido pelo Pix', { kind: 'income', category: 'reembolso' }],
  ['Estorno', { kind: 'income', category: 'reembolso' }],
  ['Aplicação RDB', { kind: 'internal', category: 'reserva' }],
  ['Resgate RDB', { kind: 'internal', category: 'reserva' }],
  ['Valor adicionado na conta por cartão de crédito', { kind: 'internal', category: 'cartao' }],
];

export function parseNubankCsv(text: string, userRules: Record<string, string>): ImportedRow[] {
  const table = parseCsv(text);
  const header = table[0]?.map((h) => h.trim().normalize('NFC'));
  if (!header || header.join(',') !== 'Data,Valor,Identificador,Descrição') throw new NubankFormatError();

  return table.slice(1).map(([data, valor, id, desc]) => {
    const cents = parseBRL(valor) ?? 0;
    const description = sanitizeDescription(desc);
    const who = description.split(' - ')[1] ?? '';
    const hit = RULES.find(([prefix]) => desc.startsWith(prefix));
    const base = {
      date: fromBR(data), amount: Math.abs(cents), description,
      source: 'csv' as const, externalId: id,
    };
    if (!hit) {
      const income = cents > 0;
      return { ...base, kind: income ? 'income' : 'expense', categoryId: income ? 'renda' : 'outros', needsReview: true };
    }
    const { kind, category } = hit[1];
    const categoryId = typeof category === 'string' ? category : categorizeMerchant(who || desc, userRules);
    return { ...base, kind, categoryId, needsReview: false };
  });
}
