import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatBRL } from '../lib/money';
import { tokens } from '../theme/tokens';

/** "R$ 1.200,50" -> "1.200,50", para preencher campos de valor. */
export const toField = (c: number): string => formatBRL(c, { cents: true }).replace('R$ ', '');
export const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {children}
    </ScrollView>
  );
}

export const Label = ({ children }: { children: string }) => <Text style={styles.label}>{children}</Text>;
export const Muted = ({ children }: { children: React.ReactNode }) => <Text style={styles.muted}>{children}</Text>;
export const Section = ({ children }: { children: string }) => <Text style={styles.section}>{children}</Text>;

export function Field({ label, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <TextInput accessibilityLabel={label} placeholderTextColor="#8E99A8" style={styles.input} {...rest} />
    </View>
  );
}

export function Chips<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string; color?: string }[]; value: T; onChange(id: T): void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', disabled,
}: { label: string; onPress(): void; kind?: 'primary' | 'soft' | 'danger'; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, kind === 'soft' && styles.soft, kind === 'danger' && styles.danger, disabled && styles.off]}
    >
      <Text style={[styles.buttonText, kind === 'soft' && { color: tokens.color.primary }, kind === 'danger' && { color: '#C62828' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  title, sub, right, rightSub, color, onPress,
}: { title: string; sub?: string; right?: string; rightSub?: string; color?: string; onPress?(): void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={styles.row}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? (
        <View style={styles.rowRight}>
          <Text style={styles.rowTitle}>{right}</Text>
          {rightSub ? <Text style={styles.rowSub}>{rightSub}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 20, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: tokens.color.text },
  section: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text, marginTop: 16 },
  label: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.textMuted },
  muted: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
  fieldWrap: { gap: 6 },
  input: {
    height: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: tokens.color.surfaceTint,
    fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14,
    borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surfaceTint,
  },
  chipOn: { backgroundColor: tokens.color.primary },
  chipText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.text },
  chipTextOn: { color: tokens.color.onPrimary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  button: { height: 56, borderRadius: 28, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  soft: { backgroundColor: tokens.color.surfaceTint },
  danger: { backgroundColor: '#FFE9E7' },
  buttonText: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.onPrimary },
  off: { opacity: 0.4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: tokens.color.surfaceTint, borderRadius: 18,
  },
  rowText: { flex: 1 },
  rowRight: { alignItems: 'flex-end' },
  rowTitle: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.text },
  rowSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
});
