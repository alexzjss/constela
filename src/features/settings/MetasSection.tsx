import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Goal } from '../../domain/types';
import { addGoal, addToGoal, deleteGoal, listGoals } from '../../db/repo';
import { daysBetween, fromBR, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';
import { formatBRL, parseBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

const BR_DATE = /^\d{2}\/\d{2}\/\d{4}$/;

export function MetasSection() {
  const db = useDb();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [adding, setAdding] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setGoals(await listGoals(db));
  }, [db]);
  useEffect(() => { void reload(); }, [reload]);

  const today = todayLocal();
  const targetCents = parseBRL(target);
  const deadlineIso = BR_DATE.test(deadline) ? fromBR(deadline) : null;
  const canAdd = name.trim().length > 0 && targetCents !== null && targetCents > 0 && deadlineIso !== null && daysBetween(today, deadlineIso) > 0;

  return (
    <View style={styles.root}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
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
