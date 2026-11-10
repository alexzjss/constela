import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile, Term } from '../../src/engine/invest/types';
import type { InvestSettings } from '../../src/features/invest/settings';
import { AssetSection } from '../../src/features/invest/AssetSection';
import { Disclaimer } from '../../src/features/invest/Disclaimer';
import { FixedIncomeList } from '../../src/features/invest/FixedIncomeList';
import { PlanCard } from '../../src/features/invest/PlanCard';
import { PortfolioCard } from '../../src/features/invest/PortfolioCard';
import { useInvest } from '../../src/features/invest/useInvest';
import { formatBRL, parseBRL } from '../../src/lib/money';
import { tokens } from '../../src/theme/tokens';

const PROFILES: { id: Profile; label: string }[] = [
  { id: 'conservador', label: 'Conservador' },
  { id: 'moderado', label: 'Moderado' },
  { id: 'arrojado', label: 'Arrojado' },
];
const TERMS: Term[] = [6, 12, 24];

const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const toPct = (ratio: number) => String(Math.round(ratio * 10000) / 100).replace('.', ',');
const fromPct = (text: string): number | null => {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n / 100 : null;
};

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function Investir() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, view, refreshing, refresh, update } = useInvest();
  const [amountText, setAmountText] = useState('');
  const [hypText, setHypText] = useState({ cdb: '', lci: '', custody: '' });
  const synced = useRef(false);

  // Preenche os campos só na primeira carga: depois disso o texto digitado é do usuário.
  useEffect(() => {
    if (!settings || synced.current) return;
    synced.current = true;
    setAmountText(settings.amountOverride ? formatBRL(settings.amountOverride, { cents: true }).replace('R$ ', '') : '');
    setHypText({
      cdb: toPct(settings.hyp.cdbPctCdi), lci: toPct(settings.hyp.lciPctCdi), custody: toPct(settings.hyp.custodyPct),
    });
  }, [settings]);

  if (!settings || !view) return <View style={styles.root} />;
  const open = (ref: string) => router.push({ pathname: '/conta', params: { ref } });

  // O que está digitado nos campos, pronto para salvar junto de qualquer outra mudança.
  const typed = (): Partial<InvestSettings> => {
    const cents = amountText.trim() === '' ? null : parseBRL(amountText);
    const patch: Partial<InvestSettings> = { amountOverride: cents && cents > 0 ? cents : null };
    const cdb = fromPct(hypText.cdb);
    const lci = fromPct(hypText.lci);
    const custody = fromPct(hypText.custody);
    if (cdb !== null && lci !== null && custody !== null) {
      patch.hyp = { cdbPctCdi: cdb, lciPctCdi: lci, custodyPct: custody };
    }
    return patch;
  };
  const commit = (extra: Partial<InvestSettings> = {}) => void update({ ...typed(), ...extra });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Investir</Text>

      <Text style={styles.label}>Valor a investir</Text>
      <TextInput
        accessibilityLabel="Valor a investir"
        style={styles.input}
        value={amountText}
        keyboardType="decimal-pad"
        placeholder={formatBRL(view.defaultAmount, { cents: true }).replace('R$ ', '')}
        placeholderTextColor="#8E99A8"
        onChangeText={setAmountText}
        onEndEditing={() => commit()}
      />
      <Text style={styles.muted}>Em branco usa o que sobra no mês: {formatBRL(view.defaultAmount)}.</Text>

      <Text style={styles.label}>Perfil</Text>
      <View style={styles.chips}>
        {PROFILES.map((p) => (
          <Chip key={p.id} label={p.label} on={settings.profile === p.id} onPress={() => commit({ profile: p.id })} />
        ))}
      </View>

      <Text style={styles.label}>Prazo</Text>
      <View style={styles.chips}>
        {TERMS.map((t) => (
          <Chip key={t} label={`${t} meses`} on={settings.term === t} onPress={() => commit({ term: t })} />
        ))}
      </View>

      <PlanCard view={view} />
      <PortfolioCard view={view} onEdit={() => router.push('/dados')} />
      <FixedIncomeList ranking={view.recommendation.ranking} noData={view.noData} reference={view.isReference} onOpen={open} />
      <AssetSection assets={view.assets} onOpen={open} />

      <View style={styles.hyp}>
        <Text style={styles.sectionTitle}>Hipóteses</Text>
        <Text style={styles.muted}>Não há API pública para CDB e LCI/LCA. Ajuste ao que seu banco oferece.</Text>
        {([
          ['CDB (% do CDI)', 'cdb'],
          ['LCI/LCA (% do CDI)', 'lci'],
          ['Custódia B3 (% a.a.)', 'custody'],
        ] as const).map(([label, k]) => (
          <View key={k} style={styles.hypRow}>
            <Text style={styles.hypLabel}>{label}</Text>
            <TextInput
              accessibilityLabel={label}
              style={styles.hypInput}
              value={hypText[k]}
              keyboardType="decimal-pad"
              onChangeText={(t) => setHypText((h) => ({ ...h, [k]: t }))}
              onEndEditing={() => commit()}
            />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.muted}>
          {view.asOf ? `Dados de ${brDate(view.asOf)}${view.anyStale ? ' · desatualizado' : ''}` : 'Sem dados ainda'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void refresh(true)} style={styles.refresh}>
          <Text style={styles.refreshText}>{refreshing ? 'Atualizando…' : 'Atualizar'}</Text>
        </Pressable>
      </View>
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 16 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
  label: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text, marginTop: 16, marginBottom: 6 },
  input: {
    fontFamily: tokens.font.body, fontSize: 18, color: tokens.color.text, minHeight: 48,
    borderWidth: 1, borderColor: '#C9D0DA', borderRadius: tokens.radius.sm, paddingHorizontal: 12,
  },
  muted: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surfaceTint },
  chipOn: { backgroundColor: tokens.color.primary },
  chipText: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.text },
  chipTextOn: { color: tokens.color.onPrimary },
  sectionTitle: { fontFamily: tokens.font.display, fontSize: 18, color: tokens.color.text },
  hyp: { marginTop: 24 },
  hypRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  hypLabel: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text },
  hypInput: {
    fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.text, minHeight: 44, minWidth: 90, textAlign: 'right',
    borderWidth: 1, borderColor: '#C9D0DA', borderRadius: tokens.radius.sm, paddingHorizontal: 12,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  refresh: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: tokens.radius.pill, backgroundColor: tokens.color.primary },
  refreshText: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.onPrimary },
});
