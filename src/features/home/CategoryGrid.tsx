import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { categoryById } from '../../domain/categories';
import type { MonthSummary } from '../../engine/month';
import { tokens } from '../../theme/tokens';

export function CategoryGrid({ summary }: { summary: MonthSummary }) {
  const top = summary.byCategory.slice(0, 4);
  if (top.length === 0) return null;
  return (
    <View style={styles.grid}>
      {top.map(({ categoryId, amount }) => {
        const cat = categoryById(categoryId);
        return (
          <View key={categoryId} style={[styles.cell, { backgroundColor: cat.tint }]}>
            <View style={[styles.dot, { backgroundColor: cat.color }]} />
            <Text style={styles.name} numberOfLines={1}>{cat.name}</Text>
            <Text style={styles.value}>{Math.round(amount / 100)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted },
  value: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.text },
});
