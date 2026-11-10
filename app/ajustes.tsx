import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import { Button, Muted, Screen, Section } from '../src/components/form';
import { importBackup } from '../src/db/repo';
import { AiSettings } from '../src/features/ai/AiSettings';
import { shareExport } from '../src/features/settings/shareExport';
import { useDb } from '../src/lib/db-context';

export default function Ajustes() {
  const db = useDb();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onBackup = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    setBusy(true);
    try {
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const { added, skipped } = await importBackup(db, JSON.parse(text));
      setMessage(`${added} posições novas · ${skipped} já existiam`);
    } catch {
      setMessage('Esse arquivo não é um backup do app.');
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      await shareExport(db);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Ajustes">
      <AiSettings />
      <Section>Dados</Section>
      <Button label="Importar backup" kind="soft" disabled={busy} onPress={onBackup} />
      <Button label="Exportar dados" kind="soft" disabled={busy} onPress={onExport} />
      {message ? <Muted>{message}</Muted> : null}
    </Screen>
  );
}
