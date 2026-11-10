import type { Db } from '../../db/db';
import { getUserRules, importRows } from '../../db/repo';
import { parseNubankCsv } from '../../ingest/nubank';

/** Lê um ou mais extratos do Nubank e grava só o que é novo. Lança NubankFormatError se algum não for do Nubank. */
export async function importCsvFiles(
  db: Db,
  texts: string[],
): Promise<{ added: number; skipped: number }> {
  const rules = await getUserRules(db);
  const rows = texts.flatMap((t) => parseNubankCsv(t, rules));
  return importRows(db, rows);
}
