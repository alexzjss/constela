import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryById } from '../../domain/categories';
import type { Transaction } from '../../domain/types';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

export function IncomeCard({ income, onPress }: { income: Transaction; onPress(): void }) {
  const cat = categoryById(income.categoryId);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, { backgroundColor: cat.tint }]}>
      <View style={[styles.dot, { backgroundColor: cat.color }]} />
      <View style={styles.text}>
        <Text style={styles.title}>Entrou {formatBRL(income.amount)} · {income.description || cat.name}</Text>
        <Text style={styles.sub}>Toque para ver onde investir</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, minHeight: 56 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.text },
  sub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
});
