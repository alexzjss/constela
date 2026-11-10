import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { num2, pctText } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { diversifiersFor, type Context } from './loadAnalysis';

/** Entre os ativos conhecidos, os que mais reduzem a volatilidade da carteira. */
export function DiversifyCard({ ctx, loading }: { ctx: Context | null; loading: boolean }) {
  const router = useRouter();
  const list = ctx ? diversifiersFor(ctx) : [];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Para diversificar</Text>
      {!ctx || ctx.held.length === 0 ? (
        <Text style={styles.muted}>
          {loading ? 'Calculando…' : 'Registre posições ligadas a um ativo (Pesquisar › ficha do ativo › Registrar na carteira) para ver quais ativos reduzem o risco da sua carteira.'}
        </Text>
      ) : list.length === 0 ? (
        <Text style={styles.muted}>Sem histórico suficiente nos ativos acompanhados. Acompanhe mais ativos em Pesquisar.</Text>
      ) : (
        <>
          <Text style={styles.muted}>Simulando 10% da carteira em cada um. Menor volatilidade não é garantia de retorno.</Text>
          {list.map((s) => (
            <Pressable key={s.symbol} accessibilityRole="button" style={styles.row}
              onPress={() => router.push({ pathname: '/ativo', params: { symbol: s.symbol, name: s.name } })}>
              <View style={styles.left}>
                <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.muted}>correlação {num2(s.correlation)} com a carteira</Text>
              </View>
              <Text style={styles.name}>{pctText(s.volBefore, 1)} → {pctText(s.volAfter, 1)}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, marginTop: 16, gap: 6 },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, gap: 8 },
  left: { flexShrink: 1 },
  name: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text },
});
