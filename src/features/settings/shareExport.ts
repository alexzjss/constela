import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Db } from '../../db/db';
import { exportAll } from '../../db/repo';
import { toCsv } from './exportData';

/** Grava backup JSON e CSV no cache e abre o menu de compartilhar do Android. */
export async function shareExport(db: Db): Promise<void> {
  const dump = await exportAll(db);
  const dir = FileSystem.cacheDirectory ?? '';
  const json = `${dir}paralelo-backup.json`;
  const csv = `${dir}paralelo-lancamentos.csv`;
  await FileSystem.writeAsStringAsync(json, JSON.stringify(dump, null, 2));
  await FileSystem.writeAsStringAsync(csv, toCsv(dump.transactions));
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(json, { mimeType: 'application/json', dialogTitle: 'Backup' });
  await Sharing.shareAsync(csv, { mimeType: 'text/csv', dialogTitle: 'Lançamentos' });
}
