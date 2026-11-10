import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioRow } from '../../engine/invest/portfolio';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';
import { CLASS_LABEL } from './PlanCard';
import type { InvestView } from './view';

const STATUS: Record<PortfolioRow['status'], string> = { abaixo: 'abaixo da faixa', dentro: 'na faixa', acima: 'acima da faixa' };
const pct = (n: number) => `${Math.round(n)}%`;

/** Carteira cadastrada em Investimentos contra a meta do perfil. */
export function PortfolioCard({ view }: { view: InvestView }) {
  const p = view.portfolio;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sua carteira</Text>
      {p ? (
        <>
          <Text style={styles.muted}>{formatBRL(p.total)} investidos. A sugestão do mês prioriza o que está abaixo da faixa.</Text>
          {p.rows.filter((r) => r.value > 0 || r.targetPct > 0).map((r) => (
            <View key={r.cls} style={styles.row}>
              <Text style={styles.label}>{CLASS_LABEL[r.cls]}</Text>
              <Text style={styles.value}>
                {pct(r.pct)} · {r.range ? `${r.range.min}–${r.range.max}%` : 'não sugerido'}{r.value > 0 || r.range ? ` · ${STATUS[r.status]}` : ''}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.muted}>Cadastre suas posições acima para a sugestão levar sua carteira em conta.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, marginTop: 16, gap: 4 },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text, marginBottom: 4 },
  muted: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text },
  value: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted, flexShrink: 1, textAlign: 'right' },
});
