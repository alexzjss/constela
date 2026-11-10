import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DEFAULT_CATEGORIES } from '../../domain/categories';
import type { Bill } from '../../domain/types';
import { addBill, deleteBill, listBills } from '../../db/repo';
import { useDb } from '../../lib/db-context';
import { formatBRL, parseBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

const BILL_CATEGORIES = ['contas', 'moradia', 'saude', 'educacao', 'transporte', 'outros'];

export function ContasSection() {
  const db = useDb();
  const [bills, setBills] = useState<Bill[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [category, setCategory] = useState('contas');

  const reload = useCallback(async () => {
    setBills(await listBills(db));
  }, [db]);
  useEffect(() => { void reload(); }, [reload]);

  const cents = parseBRL(amount);
  const dueDay = Number(day);
  const canAdd = name.trim().length > 0 && cents !== null && cents > 0 && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31;

  return (
    <View style={styles.root}>
      {bills.map((b) => (
        <View key={b.id} style={styles.bill}>
          <View style={[styles.dot, { backgroundColor: DEFAULT_CATEGORIES.find((c) => c.id === b.categoryId)?.color }]} />
          <View style={styles.billText}>
            <Text style={styles.billName}>{b.name}</Text>
            <Text style={styles.billSub}>dia {b.dueDay} · {formatBRL(b.amount)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apagar ${b.name}`}
            onPress={async () => { await deleteBill(db, b.id); await reload(); }}
            style={styles.close}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.label}>Nova conta</Text>
      <TextInput accessibilityLabel="Nome" style={styles.input} value={name} onChangeText={setName} placeholder="Internet" placeholderTextColor="#8E99A8" />
      <View style={styles.pair}>
        <TextInput accessibilityLabel="Valor" style={[styles.input, styles.flex]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="80,00" placeholderTextColor="#8E99A8" />
        <TextInput accessibilityLabel="Dia do vencimento" style={[styles.input, styles.day]} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} placeholder="Dia" placeholderTextColor="#8E99A8" />
      </View>
      <View style={styles.chips}>
        {BILL_CATEGORIES.map((id) => {
          const c = DEFAULT_CATEGORIES.find((x) => x.id === id)!;
          const on = id === category;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(id)} style={[styles.chip, on && { backgroundColor: c.tint, borderColor: c.color }]}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={styles.chipText}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdd }}
        disabled={!canAdd}
        onPress={async () => {
          await addBill(db, { name: name.trim(), amount: cents as number, dueDay, categoryId: category });
          setName(''); setAmount(''); setDay('');
          await reload();
        }}
        style={[styles.add, !canAdd && styles.off]}
      >
        <Text style={styles.addText}>Adicionar</Text>
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
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  day: { width: 84 },
  bill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tokens.color.surfaceTint, borderRadius: 18, paddingLeft: 16 },
  billText: { flex: 1, paddingVertical: 12 },
  billName: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.text },
  billSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: tokens.color.surfaceTint },
  chipText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.text },
  add: { height: 56, borderRadius: 28, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  addText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
  off: { opacity: 0.4 },
});
