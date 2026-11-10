import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlanWarning } from '../../engine/invest/allocation';
import type { AssetClass } from '../../engine/invest/types';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';
import type { InvestView } from './view';

export const CLASS_LABEL: Record<AssetClass, string> = {
  rendaFixa: 'Renda fixa', fii: 'FIIs', acoesBr: 'Ações BR', exterior: 'Exterior', cripto: 'Cripto',
};

const WARNING: Record<PlanWarning, string> = {
  'sem-valor': 'Informe quanto quer investir para ver a sugestão.',
};

export function PlanCard({ view }: { view: InvestView }) {
  const { plan, classes } = view.recommendation;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Onde investir</Text>
      {plan.warnings.map((w) => (
        <Text key={w} style={styles.warn}>{WARNING[w]}</Text>
      ))}
      {plan.steps.map((s, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>
            Investir pelo perfil
          </Text>
          <Text style={styles.value}>{formatBRL(s.amount)}</Text>
        </View>
      ))}
      <Text style={styles.sub}>{view.portfolio ? 'Mix do perfil, ajustado à sua carteira' : 'Mix do perfil'}</Text>
      {classes.map((c) => (
        <View key={c.cls} style={styles.row}>
          <Text style={styles.label}>{CLASS_LABEL[c.cls]}</Text>
          <Text style={styles.muted}>
            {c.range ? `${c.range.min}–${c.range.max}%${c.amount > 0 ? ` · ${formatBRL(c.amount)}` : ''}` : 'não sugerido neste perfil'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, marginTop: 16 },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text, marginBottom: 8 },
  sub: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text, marginTop: 12, marginBottom: 4 },
  warn: { fontFamily: tokens.font.bodyMedium, fontSize: 13, color: tokens.color.primaryDark, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text, flexShrink: 1 },
  value: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
});
