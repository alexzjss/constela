import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryGrid } from '../../src/features/home/CategoryGrid';
import { MonthBar } from '../../src/features/home/MonthBar';
import { ScoreHeader } from '../../src/features/home/ScoreHeader';
import { useHome } from '../../src/features/home/useHome';
import { tokens } from '../../src/theme/tokens';

export default function Inicio() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useHome();
  if (!state) return <View style={styles.root} />;
  const empty = state.count === 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ flexGrow: 1 }}>
      <ScoreHeader month={state.month} score={empty ? null : state.score} topInset={insets.top} />
      <View style={styles.panel}>
        {empty ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/ajustes')} style={styles.cta}>
            <Text style={styles.ctaText}>Importar extrato</Text>
          </Pressable>
        ) : (
          <>
            <MonthBar summary={state.summary} />
            <CategoryGrid summary={state.summary} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.primary },
  panel: {
    flex: 1, backgroundColor: tokens.color.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, gap: 20,
  },
  cta: { height: 56, borderRadius: 28, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
});
