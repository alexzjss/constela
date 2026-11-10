import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Disclaimer } from '../src/features/invest/Disclaimer';
import { useInvest } from '../src/features/invest/useInvest';
import { explainFor } from '../src/features/invest/view';
import { tokens } from '../src/theme/tokens';

export default function Conta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { view } = useInvest();
  const info = view && ref ? explainFor(view, ref) : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>{info?.title ?? 'Ver a conta'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {info ? (
        info.lines.map((l, i) => (
          <View key={i} style={styles.line}>
            <Text style={styles.label}>{l.label}</Text>
            <Text style={styles.value}>{l.value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.label}>{view ? 'Nada para mostrar' : 'Carregando…'}</Text>
      )}
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: tokens.font.display, fontSize: 24, color: tokens.color.text, flexShrink: 1 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: tokens.color.text },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E3E7EC' },
  label: { fontFamily: tokens.font.bodySemi, fontSize: 13, color: tokens.color.textMuted },
  value: { fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.text, marginTop: 2 },
});
