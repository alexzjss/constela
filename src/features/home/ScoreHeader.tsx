import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Score } from '../../engine/composite';
import { monthNamePt } from '../../lib/dates';
import { tokens } from '../../theme/tokens';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  month: string;
  score: Score | null; // null = sem dados ainda
  topInset: number;
}

export function ScoreHeader({ month, score, topInset }: Props) {
  const router = useRouter();
  const pillars: [string, number][] = [
    ['Folga', score ? score.folga / 30 : 0],
    ['Reserva', score?.reserva != null ? score.reserva / 30 : 0],
    ['Constância', score ? score.constancia / 20 : 0],
    ['Rumo', score?.rumo != null ? score.rumo / 20 : 0],
  ];
  return (
    <View style={[styles.wrap, { paddingTop: topInset + 12 }]}>
      <View style={styles.topRow}>
        <Text style={styles.month}>{cap(monthNamePt(month))}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/ajustes')} style={styles.settings}>
          <Text style={styles.settingsText}>Ajustes</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={score ? `Score ${score.total} de 100. Ver a conta` : 'Sem score'}
        disabled={!score}
        onPress={() => router.push('/score')}
        style={styles.scoreRow}
      >
        <Text style={styles.score}>{score ? score.total : '—'}</Text>
        {score?.provisional ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>provisório</Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.pillars}>
        {pillars.map(([name, ratio]) => (
          <View key={name} style={styles.pillar}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <Text style={styles.pillarName}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: tokens.color.primary, paddingHorizontal: 24, paddingBottom: 28, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { fontFamily: tokens.font.display, fontSize: 18, color: tokens.color.onPrimary },
  settings: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  settingsText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  score: { fontFamily: tokens.font.display, fontSize: 140, lineHeight: 124, letterSpacing: -5, color: tokens.color.onPrimary },
  badge: { backgroundColor: tokens.color.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  badgeText: { fontFamily: tokens.font.bodySemi, fontSize: 13, color: tokens.color.primary },
  pillars: { flexDirection: 'row', gap: 8 },
  pillar: { flex: 1, gap: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: tokens.color.primaryLight, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: tokens.color.surface },
  pillarName: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.primaryTint },
});
