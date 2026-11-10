import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Goal } from '../src/domain/types';
import { addGoal, addToGoal, deleteGoal, getSetting, listGoals, listTransactions, setSetting } from '../src/db/repo';
import { rdbNet } from '../src/engine/composite';
import { daysBetween, fromBR, todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const BR_DATE = /^\d{2}\/\d{2}\/\d{4}$/;

export default function Metas() {
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reserve, setReserve] = useState('');
  const [suggestion, setSuggestion] = useState(0);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [adding, setAdding] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setGoals(await listGoals(db));
    const saved = await getSetting(db, 'reserveBalance');
    setReserve(saved !== null ? formatBRL(Number(saved), { cents: true }).replace('R$ ', '') : '');
    setSuggestion(saved === null ? rdbNet(await listTransactions(db, '0000-01-01', '9999-12-31')) : 0);
  }, [db]);
  useEffect(() => { void reload(); }, [reload]);

  const today = todayLocal();
  const targetCents = parseBRL(target);
  const deadlineIso = BR_DATE.test(deadline) ? fromBR(deadline) : null;
  const canAdd = name.trim().length > 0 && targetCents !== null && targetCents > 0 && deadlineIso !== null && daysBetween(today, deadlineIso) > 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>Metas e reserva</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Reserva de emergência</Text>
      <TextInput
        accessibilityLabel="Saldo da reserva"
        style={styles.input}
        value={reserve}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor="#8E99A8"
        onChangeText={setReserve}
        onEndEditing={async () => {
          const c = parseBRL(reserve);
          if (c !== null && c >= 0) await setSetting(db, 'reserveBalance', String(c));
        }}
      />
      {suggestion > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={async () => { await setSetting(db, 'reserveBalance', String(suggestion)); await reload(); }}
          style={styles.suggest}
        >
          <Text style={styles.suggestText}>Usar {formatBRL(suggestion)} da caixinha</Text>
        </Pressable>
      ) : null}

      {goals.map((g) => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        const input = adding[g.id] ?? '';
        const add = parseBRL(input);
        return (
          <View key={g.id} style={styles.goal}>
            <View style={styles.goalHead}>
              <Text style={styles.goalName}>{g.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Apagar ${g.name}`} onPress={async () => { await deleteGoal(db, g.id); await reload(); }} style={styles.close}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
            <Text style={styles.sub}>{formatBRL(g.saved)} de {formatBRL(g.target)} · {pct}%</Text>
            <View style={styles.pair}>
              <TextInput
                accessibilityLabel={`Valor a guardar em ${g.name}`}
                style={[styles.input, styles.flex]}
                value={input}
                keyboardType="decimal-pad"
                placeholder="50,00"
                placeholderTextColor="#8E99A8"
                onChangeText={(t) => setAdding((a) => ({ ...a, [g.id]: t }))}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!(add !== null && add > 0)}
                onPress={async () => {
                  await addToGoal(db, g.id, add as number);
                  setAdding((a) => ({ ...a, [g.id]: '' }));
                  await reload();
                }}
                style={[styles.save, !(add !== null && add > 0) && styles.off]}
              >
                <Text style={styles.saveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.label}>Nova meta</Text>
      <TextInput accessibilityLabel="Nome da meta" style={styles.input} value={name} onChangeText={setName} placeholder="Viagem" placeholderTextColor="#8E99A8" />
      <View style={styles.pair}>
        <TextInput accessibilityLabel="Valor da meta" style={[styles.input, styles.flex]} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="1000,00" placeholderTextColor="#8E99A8" />
        <TextInput accessibilityLabel="Prazo" style={[styles.input, styles.date]} value={deadline} onChangeText={setDeadline} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/aaaa" placeholderTextColor="#8E99A8" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdd }}
        disabled={!canAdd}
        onPress={async () => {
          await addGoal(db, { name: name.trim(), target: targetCents as number, startDate: today, deadline: deadlineIso as string });
          setName(''); setTarget(''); setDeadline('');
          await reload();
        }}
        style={[styles.add, !canAdd && styles.off]}
      >
        <Text style={styles.addText}>Criar meta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 20, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: tokens.color.text },
  label: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.textMuted, marginTop: 8 },
  input: {
    height: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: tokens.color.surfaceTint,
    fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.text,
  },
  suggest: { minHeight: 48, borderRadius: 16, backgroundColor: tokens.color.primaryTint, alignItems: 'center', justifyContent: 'center' },
  suggestText: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.primary },
  goal: { backgroundColor: tokens.color.surfaceTint, borderRadius: 22, padding: 16, gap: 10 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text },
  track: { height: 8, borderRadius: 4, backgroundColor: tokens.color.surface, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: tokens.color.primary },
  sub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  date: { width: 140 },
  save: { minWidth: 96, borderRadius: 16, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  saveText: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.onPrimary },
  add: { height: 56, borderRadius: 28, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  addText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
  off: { opacity: 0.4 },
});
