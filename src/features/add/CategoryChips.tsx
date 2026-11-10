import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_CATEGORIES } from '../../domain/categories';
import type { Kind } from '../../domain/types';
import { tokens } from '../../theme/tokens';

interface Props {
  kind: Kind;
  selected: string;
  onSelect(id: string): void;
}

export function CategoryChips({ kind, selected, onSelect }: Props) {
  const options = DEFAULT_CATEGORIES.filter((c) => c.kind === kind && c.id !== 'cartao');
  return (
    <View style={styles.wrap}>
      {options.map((c) => {
        const on = c.id === selected;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(c.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={[styles.text, on && styles.textOn]}>{c.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: tokens.color.primaryDark,
  },
  chipOn: { backgroundColor: tokens.color.surface },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.onPrimary },
  textOn: { fontFamily: tokens.font.bodySemi, color: tokens.color.text },
});
