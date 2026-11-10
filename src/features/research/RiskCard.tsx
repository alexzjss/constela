import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { num2, pctText } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import type { PortfolioRisk } from './analysis';

/** Quanto a carteira balança e quais posições andam juntas. */
export function RiskCard({ risk, nameOf }: { risk: PortfolioRisk | null; nameOf: (symbol: string) => string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Risco da carteira</Text>
      {!risk || risk.coverage === 0 ? (
        <Text style={styles.muted}>
          Ligue suas posições a um ativo da pesquisa (campo "Símbolo" ao criar a posição ou "Registrar na carteira" na ficha do ativo) para ver volatilidade e correlações.
        </Text>
      ) : (
        <>
          <Text style={styles.big}>{pctText(risk.volatility, 1)} <Text style={styles.muted}>de volatilidade ao ano</Text></Text>
          <Text style={styles.muted}>
            Calculado sobre {pctText(risk.coverage)} da carteira (a parte ligada a um ativo), {risk.weeks} semanas de histórico.
          </Text>
          {risk.pairs.length > 0 ? <Text style={styles.sub}>Posições que andam juntas</Text> : null}
          {risk.pairs.map((p) => (
            <View key={`${p.a}|${p.b}`} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>{nameOf(p.a)} e {nameOf(p.b)}</Text>
              <Text style={styles.value}>{num2(p.correlation)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, marginTop: 16, gap: 4 },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text, marginBottom: 4 },
  big: { fontFamily: tokens.font.display, fontSize: 24, color: tokens.color.text },
  sub: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text, marginTop: 12 },
  muted: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text, flexShrink: 1 },
  value: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text },
});
