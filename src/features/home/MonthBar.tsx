import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { categoryById } from '../../domain/categories';
import type { MonthSummary } from '../../engine/month';
import { monthNamePt } from '../../lib/dates';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

export function MonthBar({ summary }: { summary: MonthSummary }) {
  const { spent, byCategory, ghost } = summary;
  const ghostLine = ghost
    ? `${formatBRL(Math.abs(ghost.diff))} ${ghost.diff >= 0 ? 'à frente' : 'atrás'} de ${monthNamePt(ghost.month)}`
    : null;
  // A barra vai até o maior entre o gasto atual e o fantasma.
  const scale = Math.max(spent, ghost?.spentSameDay ?? 0, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Mês</Text>
        <Text style={styles.total}>{formatBRL(spent)}</Text>
      </View>
      <View style={styles.barArea}>
        <View style={styles.bar}>
          {byCategory.map((c) => (
            <View
              key={c.categoryId}
              style={{ width: `${(c.amount / scale) * 100}%`, backgroundColor: categoryById(c.categoryId).color, borderRadius: 6 }}
            />
          ))}
        </View>
        {ghost && ghost.spentSameDay > 0 ? (
          <View style={[styles.ghost, { left: `${(ghost.spentSameDay / scale) * 100}%` }]} />
        ) : null}
      </View>
      {ghostLine ? <Text style={styles.ghostText}>{ghostLine}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.textMuted },
  total: { fontFamily: tokens.font.display, fontSize: 22, color: tokens.color.text },
  barArea: { height: 30, justifyContent: 'center' },
  bar: { flexDirection: 'row', gap: 3, height: 22, backgroundColor: tokens.color.surfaceTint, borderRadius: 6, overflow: 'hidden' },
  ghost: { position: 'absolute', top: 0, height: 30, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: tokens.color.text },
  ghostText: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.primary },
});
