import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { monthNamePt, nextMonth, prevMonth } from '../lib/dates';
import { tokens } from '../theme/tokens';

/** ‹ novembro 2026 ›. Não deixa passar do mês atual. */
export function MonthNav({ month, current, onChange }: { month: string; current: string; onChange(m: string): void }) {
  const atEnd = month >= current;
  return (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => onChange(prevMonth(month))} style={styles.arrow}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text style={styles.month}>{monthNamePt(month)} {month.slice(0, 4)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        disabled={atEnd}
        onPress={() => onChange(nextMonth(month))}
        style={[styles.arrow, atEnd && { opacity: 0.3 }]}
      >
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: tokens.color.primary },
  month: { fontFamily: tokens.font.display, fontSize: 22, color: tokens.color.text, textTransform: 'capitalize' },
});
