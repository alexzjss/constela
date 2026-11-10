import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

export function TodayRow({ amount }: { amount: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Hoje você pode gastar ${formatBRL(amount)}`}>
      <Text style={styles.label}>Hoje</Text>
      <Text style={styles.value}>{formatBRL(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.textMuted },
  value: { fontFamily: tokens.font.display, fontSize: 40, color: tokens.color.primary },
});
