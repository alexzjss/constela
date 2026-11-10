import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NextAction, Score } from '../src/engine/composite';
import { useHome } from '../src/features/home/useHome';
import { formatBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const dec = (n: number) => n.toFixed(1).replace('.', ',');

interface Pillar { name: string; points: number | null; max: number; line: string; action?: { label: string; to: string } }

function pillars(s: Score): Pillar[] {
  const d = s.detail;
  return [
    {
      name: 'Folga', points: s.folga, max: 30,
      line: d.savingsPct === null ? 'Sem renda nos últimos 30 dias' : `Sobrou ${Math.round(d.savingsPct * 100)}% da renda em 30 dias`,
    },
    {
      name: 'Reserva', points: s.reserva, max: 30,
      line: d.reserveMonths === null ? 'Reserva não informada' : `Cobre ${dec(d.reserveMonths)} meses de gasto essencial`,
      action: d.reserveMonths === null ? { label: 'Informar', to: '/metas' } : undefined,
    },
    { name: 'Constância', points: s.constancia, max: 20, line: `${d.coveredDays} de 14 dias registrados` },
    {
      name: 'Rumo', points: s.rumo, max: 20,
      line: d.goalsPct === null ? 'Sem metas' : `${Math.round(d.goalsPct * 100)}% do planejado até hoje`,
      action: d.goalsPct === null ? { label: 'Criar meta', to: '/metas' } : undefined,
    },
  ];
}

function nextLabel(n: NextAction): string {
  if (n.kind === 'registros') return 'Registrar os dias em falta';
  if (n.kind === 'meta') return `Guardar ${formatBRL(n.amount ?? 0)} numa meta`;
  return `Guardar ${formatBRL(n.amount ?? 0)} na reserva`;
}

export default function ScoreDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useHome();
  const score = state?.score;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.topRow}>
        <Text style={styles.total}>{score ? score.total : '—'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {score?.provisional ? <Text style={styles.badge}>provisório</Text> : null}

      {score ? pillars(score).map((p) => (
        <View key={p.name} style={styles.pillar}>
          <View style={styles.pillarHead}>
            <Text style={styles.pillarName}>{p.name}</Text>
            <Text style={styles.pillarPts}>{p.points === null ? '—' : Math.round(p.points)}/{p.max}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${p.points === null ? 0 : Math.round((p.points / p.max) * 100)}%` }]} />
          </View>
          <Text style={styles.line}>{p.line}</Text>
          {p.action ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(p.action!.to as never)} style={styles.link}>
              <Text style={styles.linkText}>{p.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      )) : null}

      {score?.next ? (
        <View style={styles.next}>
          <Text style={styles.nextLabel}>{nextLabel(score.next)}</Text>
          <Text style={styles.nextGain}>+{score.next.gain}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.primary },
  content: { paddingHorizontal: 20, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  total: { fontFamily: tokens.font.display, fontSize: 120, lineHeight: 110, letterSpacing: -4, color: tokens.color.onPrimary },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: tokens.color.onPrimary, fontSize: 22 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: tokens.color.surface, color: tokens.color.primary, overflow: 'hidden',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, fontFamily: tokens.font.bodySemi, fontSize: 13,
  },
  pillar: { backgroundColor: tokens.color.surface, borderRadius: 22, padding: 18, gap: 10 },
  pillarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pillarName: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text },
  pillarPts: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: tokens.color.surfaceTint, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: tokens.color.primary },
  line: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.textMuted },
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.primary },
  next: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: tokens.color.text,
    borderRadius: 22, padding: 18,
  },
  nextLabel: { flex: 1, fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
  nextGain: { fontFamily: tokens.font.display, fontSize: 28, color: '#FFC53D' },
});
