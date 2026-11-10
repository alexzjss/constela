import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Db } from '../../db/db';
import { exportAll } from '../../db/repo';

/** Grava o backup JSON no cache e abre o menu de compartilhar do Android. */
export async function shareExport(db: Db): Promise<void> {
  const dump = await exportAll(db);
  const json = `${FileSystem.cacheDirectory ?? ''}carteira-backup.json`;
  await FileSystem.writeAsStringAsync(json, JSON.stringify(dump, null, 2));
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(json, { mimeType: 'application/json', dialogTitle: 'Backup' });
}
