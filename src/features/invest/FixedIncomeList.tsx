import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FixedIncomeResult } from '../../engine/invest/fixedIncome';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

const pct = (x: number) => `${(x * 100).toFixed(2).replace('.', ',')}% a.a.`;

export function FixedIncomeList(props: {
  ranking: FixedIncomeResult[];
  noData: boolean;
  reference?: boolean;
  onOpen: (ref: string) => void;
}) {
  const { ranking, noData, reference, onOpen } = props;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Renda fixa, líquido de impostos</Text>
      {noData ? (
        <Text style={styles.muted}>Sem dados de taxas ainda. Conecte-se para atualizar.</Text>
      ) : (
        <>
        {reference ? <Text style={styles.muted}>Simulação sobre R$ 1.000, sem sobra este mês.</Text> : null}
        {ranking.map((r) => (
          <Pressable key={r.id} accessibilityRole="button" onPress={() => onOpen(`fixed:${r.id}`)} style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.muted}>{r.liquidity === 'diaria' ? 'liquidez diária' : 'no vencimento'}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.name}>{pct(r.netAnnual)}</Text>
              <Text style={styles.muted}>+{formatBRL(r.netProfit)} em {r.term} meses</Text>
            </View>
          </Pressable>
        ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 24 },
  title: { fontFamily: tokens.font.display, fontSize: 18, color: tokens.color.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E3E7EC' },
  left: { flexShrink: 1 },
  right: { alignItems: 'flex-end' },
  name: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted },
});
