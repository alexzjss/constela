import { readFileSync } from 'fs';
import { parseNubankCsv, NubankFormatError } from '../../src/ingest/nubank';

const text = readFileSync('data/samples/nubank-exemplo.csv', 'utf8');
const rows = parseNubankCsv(text, {});
const find = (prefix: string) => rows.find((r) => r.description.startsWith(prefix))!;

test('lê todas as linhas, mesmo com BOM e vírgula entre aspas', () => {
  expect(rows).toHaveLength(18);
  expect(find('Compra no débito - LOJA, DO ZE').amount).toBe(990);
});

test('Pix enviado vira gasto em Outros, com descrição sanitizada', () => {
  const pix = find('Transferência enviada pelo Pix');
  expect(pix).toMatchObject({
    kind: 'expense', categoryId: 'outros', amount: 1680, date: '2026-10-02',
    source: 'csv', externalId: 'id-0001|-16.80', needsReview: false,
  });
  expect(pix.description).toBe('Transferência enviada pelo Pix - FULANO DE TAL');
});

test('compra no débito usa o dicionário de estabelecimentos', () => {
  expect(find('Compra no débito - PADARIA')).toMatchObject({ kind: 'expense', categoryId: 'comida' });
});

test('recebimentos', () => {
  expect(find('Transferência recebida pelo Pix')).toMatchObject({ kind: 'income', categoryId: 'renda', amount: 30000 });
  expect(find('Transferência Recebida')).toMatchObject({ kind: 'income', categoryId: 'renda' });
  expect(find('Depósito Recebido por Boleto')).toMatchObject({ kind: 'income', categoryId: 'renda' });
  expect(find('Reembolso recebido')).toMatchObject({ kind: 'income', categoryId: 'reembolso' });
  expect(find('Estorno')).toMatchObject({ kind: 'income', categoryId: 'reembolso' });
});

test('RDB e crédito adicionado são internos, nunca renda nem gasto', () => {
  expect(find('Aplicação RDB')).toMatchObject({ kind: 'internal', categoryId: 'reserva' });
  expect(find('Resgate RDB')).toMatchObject({ kind: 'internal', categoryId: 'reserva' });
  expect(find('Valor adicionado')).toMatchObject({ kind: 'internal' });
});

test('fatura e débito em conta', () => {
  expect(find('Pagamento de fatura')).toMatchObject({ kind: 'expense', categoryId: 'cartao' });
  expect(find('Débito em conta')).toMatchObject({ kind: 'expense', categoryId: 'contas' });
});

test('todos os valores ficam positivos e nenhum CPF/banco vaza', () => {
  expect(rows.every((r) => r.amount > 0)).toBe(true);
  expect(rows.some((r) => /•|Agência|BANCO|\d{3}\.\d{3}/.test(r.description))).toBe(false);
});

test('tipo desconhecido vai para revisão', () => {
  expect(find('Tipo Inventado')).toMatchObject({ needsReview: true, kind: 'expense', categoryId: 'outros' });
});

test('cabeçalho errado lança NubankFormatError', () => {
  expect(() => parseNubankCsv('a,b\n1,2', {})).toThrow(NubankFormatError);
});

test('mesmo Identificador com valores opostos são lançamentos distintos', () => {
  const pair = rows.filter((r) => r.externalId?.startsWith('id-dup-1'));
  expect(pair).toHaveLength(2);
  expect(new Set(pair.map((r) => r.externalId)).size).toBe(2);
});

test('Pix pago no crédito não conta como gasto (a fatura já o conta)', () => {
  const pair = rows.filter((r) => r.externalId?.startsWith('id-dup-1'));
  expect(pair.map((r) => r.kind)).toEqual(['internal', 'internal']);
});

test('Pix estornado se anula: nem gasto nem renda', () => {
  const pair = rows.filter((r) => r.externalId?.startsWith('id-dup-2'));
  expect(pair.map((r) => r.kind)).toEqual(['internal', 'internal']);
});
