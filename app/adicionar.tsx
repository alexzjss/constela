import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryChips } from '../src/features/add/CategoryChips';
import { useAdd } from '../src/features/add/useAdd';
import { deleteTransaction } from '../src/db/repo';
import { fromBR, isRealDate, monthOf, todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function Adicionar() {
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [today] = useState(() => todayLocal()); // fixo enquanto a folha está aberta
  // ?id= edita um lançamento; ?month= cria dentro de um mês passado; ?kind= escolhe Gasto/Ganho.
  const { id, month, kind: kindParam } = useLocalSearchParams<{ id?: string; month?: string; kind?: 'expense' | 'income' }>();
  const add = useAdd(db, today, id);
  const [typed, setTyped] = useState<string | null>(null);
  const [typedDate, setTypedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = add.draft?.kind ?? 'expense';

  useEffect(() => {
    if (id) return;
    if (kindParam === 'income' || kindParam === 'expense') add.setKind(kindParam);
    if (month && month !== monthOf(today)) add.setDate(`${month}-01`);
    // só na abertura da folha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountText = typed ?? (add.draft ? formatBRL(add.draft.amount, { cents: true }) : 'R$ 0');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <View style={styles.toggle}>
          {(['expense', 'income'] as const).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === k }}
              onPress={() => add.setKind(k)}
              style={[styles.toggleItem, kind === k && styles.toggleOn]}
            >
              <Text style={[styles.toggleText, kind === k && styles.toggleTextOn]}>
                {k === 'expense' ? 'Gasto' : 'Ganho'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel="Valor"
        style={styles.amount}
        value={amountText}
        keyboardType="decimal-pad"
        selectTextOnFocus
        onChangeText={(t) => {
          setTyped(t);
          const cents = parseBRL(t);
          add.setAmount(cents !== null && cents > 0 ? cents : 0);
        }}
        placeholderTextColor={tokens.color.primaryTint}
      />

      <TextInput
        accessibilityLabel="Descrição"
        style={styles.input}
        value={add.description}
        onChangeText={(t) => {
          setTyped(null);
          add.setText(t);
        }}
        placeholder="gastei 35 no almoço"
        placeholderTextColor="#8E99A8"
      />

      <CategoryChips kind={kind} selected={add.draft?.categoryId ?? (kind === 'income' ? 'renda' : 'outros')} onSelect={add.setCategory} />

      <View style={styles.meta}>
        <TextInput
          accessibilityLabel="Data"
          style={[styles.metaChip, styles.metaText]}
          value={typedDate ?? brDate(add.draft?.date ?? today)}
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={(t) => {
            setTypedDate(t);
            const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(t) ? fromBR(t) : null;
            if (iso && isRealDate(iso)) add.setDate(iso);
          }}
          onEndEditing={() => setTypedDate(null)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !add.canSave || saving }}
        disabled={!add.canSave || saving}
        onPress={async () => {
          setSaving(true);
          setError(null);
          try {
            const saved = await add.save();
            if (!id && saved?.kind === 'income') router.replace({ pathname: '/entrada', params: { id: saved.id } });
            else router.back();
          } catch {
            setError('Não consegui salvar. Tente de novo.');
            setSaving(false);
          }
        }}
        style={[styles.save, (!add.canSave || saving) && styles.saveOff]}
      >
        <Text style={styles.saveText}>Salvar</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {id ? (
        <Pressable
          accessibilityRole="button"
          onPress={async () => { await deleteTransaction(db, id); router.back(); }}
          style={styles.remove}
        >
          <Text style={styles.removeText}>Apagar lançamento</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.primary },
  content: { paddingHorizontal: 20, gap: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { flexDirection: 'row', backgroundColor: tokens.color.primaryDark, borderRadius: 18, padding: 4 },
  toggleItem: { minHeight: 44, paddingHorizontal: 18, borderRadius: 14, justifyContent: 'center' },
  toggleOn: { backgroundColor: tokens.color.surface },
  toggleText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.onPrimary },
  toggleTextOn: { fontFamily: tokens.font.bodySemi, color: tokens.color.primary },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: tokens.color.onPrimary, fontSize: 22 },
  amount: {
    fontFamily: tokens.font.display, fontSize: 72, color: tokens.color.onPrimary,
    paddingVertical: 12, letterSpacing: -2,
  },
  input: {
    height: 56, borderRadius: 18, paddingHorizontal: 18, backgroundColor: tokens.color.surface,
    fontFamily: tokens.font.body, fontSize: 17, color: tokens.color.text,
  },
  meta: { flexDirection: 'row', gap: 8 },
  metaChip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 16, backgroundColor: tokens.color.primaryDark, justifyContent: 'center' },
  metaText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.onPrimary },
  save: { height: 60, borderRadius: 30, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveOff: { opacity: 0.4 },
  error: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.onPrimary },
  remove: { height: 52, borderRadius: 26, borderWidth: 2, borderColor: tokens.color.onPrimary, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.onPrimary },
  saveText: { fontFamily: tokens.font.display, fontSize: 17, color: tokens.color.primary },
});
