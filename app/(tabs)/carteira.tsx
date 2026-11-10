import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/form';
import { Disclaimer } from '../../src/features/invest/Disclaimer';
import { HoldingsSection } from '../../src/features/invest/HoldingsSection';
import { PortfolioCard } from '../../src/features/invest/PortfolioCard';
import { useHoldings } from '../../src/features/invest/useHoldings';
import { useInvest } from '../../src/features/invest/useInvest';
import { portfolioRisk } from '../../src/features/research/analysis';
import { RiskCard } from '../../src/features/research/RiskCard';
import { useResearch } from '../../src/features/research/useResearch';
import { tokens } from '../../src/theme/tokens';

export default function Carteira() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { view, update } = useInvest();
  const holdings = useHoldings(view?.snapshot ?? null);
  const research = useResearch();

  const risk = useMemo(
    () => (research.ctx ? portfolioRisk(research.ctx.held, research.ctx.fx, holdings.view.summary.value) : null),
    [research.ctx, holdings.view.summary.value],
  );
  const nameOf = (s: string) => research.ctx?.series[s]?.name ?? s;

  if (!view) return <ScrollView style={styles.root} />;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Carteira</Text>
      <HoldingsSection view={holdings.view} onChange={() => { void holdings.reload(); void update({}); void research.reload(); }} />
      <PortfolioCard view={view} />
      <RiskCard risk={risk} nameOf={nameOf} />
      <Button label="Ajustes e backup" kind="soft" onPress={() => router.push('/ajustes')} />
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
});
