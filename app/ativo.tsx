import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AiCard } from '../src/features/ai/AiCard';
import { assetContext } from '../src/ai/context';
import { Button, Field, Muted, Row, Screen, Section } from '../src/components/form';
import { listHoldings } from '../src/db/holdings';
import type { Holding, HoldingType } from '../src/domain/types';
import type { AssetClass } from '../src/engine/invest/types';
import { registerInvestment } from '../src/features/invest/actions';
import { CLASS_LABEL } from '../src/features/invest/PlanCard';
import { Disclaimer } from '../src/features/invest/Disclaimer';
import { analysisFor } from '../src/features/research/loadAnalysis';
import { useResearch } from '../src/features/research/useResearch';
import { addToWatchlist, loadWatchlist, removeFromWatchlist } from '../src/features/research/watchlist';
import { classOf } from '../src/invest/sources/yahooSearch';
import { todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { num2, pctText, signedPct } from '../src/lib/format';
import { parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

type Cls = Exclude<AssetClass, 'rendaFixa'>;
const HOLDING_OF: Record<Cls, HoldingType> = { fii: 'fii', acoesBr: 'acoes', exterior: 'exterior', cripto: 'cripto' };
const isCls = (x: unknown): x is Cls => x === 'fii' || x === 'acoesBr' || x === 'exterior' || x === 'cripto';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function Ativo() {
  const router = useRouter();
  const db = useDb();
  const p = useLocalSearchParams<{ symbol: string; name?: string; cls?: string }>();
  const symbol = String(p.symbol ?? '');
  const cls: Cls = isCls(p.cls) ? p.cls : classOf(symbol, 'EQUITY');
  const { ctx, loading, reload } = useResearch([symbol]);
  const [watching, setWatching] = useState(false);
  const [held, setHeld] = useState<Holding | null>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const refreshLocal = async () => {
    setWatching((await loadWatchlist(db)).some((w) => w.symbol === symbol));
    setHeld((await listHoldings(db)).find((h) => h.symbol === symbol) ?? null);
  };
  useEffect(() => { void refreshLocal(); }, [db, symbol]);

  const a = ctx ? analysisFor(ctx, symbol) : null;
  const name = a?.name ?? p.name ?? symbol;
  const nameOf = (s: string) => ctx?.series[s]?.name ?? s;
  const amountC = parseBRL(amount);

  const toggleWatch = async () => {
    if (watching) await removeFromWatchlist(db, symbol);
    else await addToWatchlist(db, { symbol, name, cls });
    await refreshLocal();
  };

  const register = async () => {
    if (!amountC || amountC <= 0) return;
    await registerInvestment(
      db,
      held ? { kind: 'existing', holding: held, amount: amountC } : { kind: 'new', type: HOLDING_OF[cls], name, amount: amountC, symbol },
      todayLocal(),
    );
    setAmount('');
    setMsg('Registrado na carteira. A correlação com a carteira já considera este ativo.');
    await refreshLocal();
  };

  const open = (s: string) => router.push({ pathname: '/ativo', params: { symbol: s, name: nameOf(s) } });

  return (
    <Screen title={name}>
      <Muted>{`${symbol} · ${CLASS_LABEL[cls]}${a ? ` · ${a.currency}` : ''}`}</Muted>

      {!a ? (
        <Muted>{loading ? 'Carregando histórico…' : 'Sem dados deste ativo agora. Verifique a conexão e tente de novo.'}</Muted>
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="12 meses" value={signedPct(a.change12m)} />
            <Stat label="Volatilidade/ano" value={pctText(a.volatility)} />
            <Stat label="Maior queda" value={pctText(a.maxDrawdown)} />
          </View>
          {a.vsCdi12m !== null ? (
            <Muted>{`${signedPct(a.vsCdi12m)} contra o CDI em 12 meses.`}</Muted>
          ) : null}
          {a.warnings.map((w) => <Muted key={w}>{w}</Muted>)}
          {ctx?.stale ? <Muted>Parte dos dados está desatualizada (sem conexão).</Muted> : null}

          {a.insights.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>O que os números dizem</Text>
              {a.insights.map((t) => <Text key={t} style={styles.insight}>• {t}</Text>)}
            </View>
          ) : null}

          <Section>Relação com indicadores</Section>
          <Muted>Correlação (−1 a 1) e beta: quanto o ativo se move para cada 1% do indicador. Janela de {a.weeks} semanas, em reais.</Muted>
          {a.indicators.map((i) => (
            <Row key={i.symbol} title={i.label} sub={i.correlation === null ? 'sem dado suficiente' : `${i.obs} semanas`}
              right={`corr ${num2(i.correlation)}`} rightSub={`beta ${num2(i.beta)}`} />
          ))}

          {a.impact && a.impact.correlation !== null ? (
            <>
              <Section>Na sua carteira</Section>
              <Row
                title={`Correlação ${num2(a.impact.correlation)}`}
                sub={`Com ${pctText(a.impact.addWeight)} da carteira nele`}
                right={pctText(a.impact.volAfter, 1)}
                rightSub={`volatilidade (hoje ${pctText(a.impact.volBefore, 1)})`}
              />
            </>
          ) : (
            <Muted>Registre posições ligadas a ativos para ver como este se relaciona com a sua carteira.</Muted>
          )}

          {a.similar.length > 0 ? <Section>Andam parecido</Section> : null}
          {a.similar.map((s) => <Row key={s.id} title={s.name} sub={s.id} right={num2(s.correlation)} onPress={() => open(s.id)} />)}
          {a.diversifiers.length > 0 ? <Section>Diversificam em relação a ele</Section> : null}
          {a.diversifiers.map((s) => <Row key={s.id} title={s.name} sub={s.id} right={num2(s.correlation)} onPress={() => open(s.id)} />)}
        </>
      )}

      {a ? (
        <AiCard
          title="Explicar com IA"
          context={() => assetContext(a)}
          quick={[
            { id: 'ler', label: 'O que esses números dizem?', question: 'Explique o que estes números dizem sobre o ativo, para quem investe de forma geral.' },
            { id: 'carteira', label: 'E na minha carteira?', question: 'Como este ativo se relaciona com a minha carteira, segundo a correlação e a volatilidade?' },
          ]}
        />
      ) : null}

      <Section>Ações</Section>
      <Button label={watching ? 'Parar de acompanhar' : 'Acompanhar'} kind="soft" onPress={toggleWatch} />
      <Field label={held ? 'Novo aporte neste ativo (R$)' : 'Quanto você investiu neste ativo (R$)'} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="500,00" />
      <Button label={held ? 'Registrar aporte' : 'Registrar na carteira'} disabled={!amountC || amountC <= 0} onPress={register} />
      {msg ? <Muted>{msg}</Muted> : null}
      <Button label="Atualizar dados" kind="soft" onPress={() => reload(true)} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 12 },
  statValue: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text },
  statLabel: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted },
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, gap: 6 },
  cardTitle: { fontFamily: tokens.font.display, fontSize: 18, color: tokens.color.text },
  insight: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text },
});
