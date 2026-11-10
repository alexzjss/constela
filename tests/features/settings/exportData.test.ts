import { readFileSync } from 'fs';
import { memoryDb } from '../../helpers/memoryDb';
import { migrate } from '../../../src/db/schema';
import { listTransactions } from '../../../src/db/repo';
import { toCsv } from '../../../src/features/settings/exportData';
import { importCsvFiles } from '../../../src/features/settings/importCsv';
import { NubankFormatError } from '../../../src/ingest/nubank';
import { tx } from '../../helpers/tx';

const sample = readFileSync('data/samples/nubank-exemplo.csv', 'utf8');

test('toCsv: cabeçalho, valor com vírgula e tipo em português', () => {
  const t = { ...tx('2026-11-03', 3590, 'expense', 'comida'), description: 'almoço' };
  expect(toCsv([t])).toBe('data,valor,tipo,categoria,descricao\n2026-11-03,"35,90",gasto,Comida,almoço\n');
});

test('toCsv: escapa vírgula e aspas na descrição', () => {
  const t = { ...tx('2026-11-03', 100, 'income', 'renda'), description: 'a, "b"' };
  expect(toCsv([t])).toContain('ganho,Renda,"a, ""b"""');
});

test('importCsvFiles soma vários arquivos e é idempotente', async () => {
  const db = await memoryDb();
  await migrate(db);
  const first = await importCsvFiles(db, [sample, sample]);
  expect(first.added).toBe(16);
  expect(first.skipped).toBe(16);
  expect(await importCsvFiles(db, [sample])).toEqual({ added: 0, skipped: 16 });
  expect(await listTransactions(db, '2026-10-01', '2026-10-31')).toHaveLength(16);
});

test('arquivo que não é do Nubank lança NubankFormatError', async () => {
  const db = await memoryDb();
  await migrate(db);
  await expect(importCsvFiles(db, ['a,b\n1,2'])).rejects.toThrow(NubankFormatError);
});
