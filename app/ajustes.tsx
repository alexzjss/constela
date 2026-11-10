import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import { Button, Muted, Screen, Section } from '../src/components/form';
import { importBackup } from '../src/db/repo';
import { ContasSection } from '../src/features/settings/ContasSection';
import { importCsvFiles } from '../src/features/settings/importCsv';
import { MetasSection } from '../src/features/settings/MetasSection';
import { NumbersSection } from '../src/features/settings/NumbersSection';
import { shareExport } from '../src/features/settings/shareExport';
import { NubankFormatError } from '../src/ingest/nubank';
import { useDb } from '../src/lib/db-context';

export default function Ajustes() {
  const db = useDb();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onImport = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true, type: ['text/csv', 'text/comma-separated-values', 'text/*'], copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    setBusy(true);
    try {
      const texts = await Promise.all(res.assets.map((a) => FileSystem.readAsStringAsync(a.uri)));
      const { added, skipped } = await importCsvFiles(db, texts);
      setMessage(`${added} novos · ${skipped} já existiam`);
    } catch (e) {
      setMessage(e instanceof NubankFormatError ? e.message : 'Não consegui ler esse arquivo.');
    } finally {
      setBusy(false);
    }
  };

  const onBackup = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    setBusy(true);
    try {
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const { added, skipped } = await importBackup(db, JSON.parse(text));
      setMessage(`${added} novos · ${skipped} já existiam`);
    } catch {
      setMessage('Esse arquivo não é um backup do Paralelo.');
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
      <Section>Seus números</Section>
      <NumbersSection />
      <Section>Contas fixas</Section>
      <ContasSection />
      <Section>Metas</Section>
      <MetasSection />
      <Section>Dados</Section>
      <Button label="Importar extrato" disabled={busy} onPress={onImport} />
      <Button label="Importar backup" kind="soft" disabled={busy} onPress={onBackup} />
      <Button label="Exportar dados" kind="soft" disabled={busy} onPress={onExport} />
      {message ? <Muted>{message}</Muted> : null}
    </Screen>
  );
}
