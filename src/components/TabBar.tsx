import type { BottomTabBarProps } from 'expo-router/tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

const LABELS: Record<string, string> = { index: 'Início', decisoes: 'Decisões', tempo: 'Tempo' };

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabs}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => navigateToTab(route.key)}
              style={styles.tab}
            >
              <Text style={[styles.label, focused && styles.labelOn]}>{LABELS[route.name] ?? route.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar gasto ou ganho"
        onPress={() => router.push('/adicionar')}
        style={styles.plus}
      >
        <Text style={styles.plusText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 10, backgroundColor: tokens.color.surface,
    borderTopWidth: 1, borderTopColor: '#E3E7EC',
  },
  tabs: { flexDirection: 'row' },
  tab: { minHeight: 48, minWidth: 48, paddingHorizontal: 10, justifyContent: 'center' },
  label: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  labelOn: { fontFamily: tokens.font.bodySemi, color: tokens.color.text },
  plus: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: tokens.color.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { color: tokens.color.onPrimary, fontSize: 32, lineHeight: 36, fontFamily: tokens.font.bodyMedium },
});
