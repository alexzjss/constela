import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDb } from '../src/lib/db-context';
import { importBackup } from '../src/db/repo';
import { importCsvFiles } from '../src/features/settings/importCsv';
import { shareExport } from '../src/features/settings/shareExport';
import { NubankFormatError } from '../src/ingest/nubank';
import { tokens } from '../src/theme/tokens';

export default function Ajustes() {
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Ajustes</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onImport} style={[styles.primary, busy && styles.off]}>
        <Text style={styles.primaryText}>Importar extrato</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/contas')} style={styles.secondary}>
        <Text style={styles.secondaryText}>Contas fixas e renda</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBackup} style={[styles.secondary, busy && styles.off]}>
        <Text style={styles.secondaryText}>Importar backup</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onExport} style={[styles.secondary, busy && styles.off]}>
        <Text style={styles.secondaryText}>Exportar dados</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface, paddingHorizontal: 20, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: tokens.color.text },
  primary: { height: 60, borderRadius: 30, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
  secondary: { height: 56, borderRadius: 28, backgroundColor: tokens.color.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.primary },
  off: { opacity: 0.5 },
  message: { fontFamily: tokens.font.bodyMedium, fontSize: 15, color: tokens.color.text, paddingTop: 8 },
});
