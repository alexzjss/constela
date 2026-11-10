import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { brDate, Button, Field, Label, Muted, Screen, Section, toField } from '../src/components/form';
import { categoryById } from '../src/domain/categories';
import type { Transaction } from '../src/domain/types';
import { getTransaction } from '../src/db/repo';
import { Disclaimer } from '../src/features/invest/Disclaimer';
import { buildParts, markHandled } from '../src/features/invest/entrada';
import { useInvest } from '../src/features/invest/useInvest';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

/** Dinheiro que acabou de entrar: onde colocar cada parte, com as taxas e indicadores de hoje. */
export default function Entrada() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [income, setIncome] = useState<Transaction | null>(null);
  const [text, setText] = useState('');
  const [forced, setForced] = useState<number | undefined>(undefined);
  const { view } = useInvest(forced);
  const seeded = useRef(false);

  useEffect(() => {
    if (id) void getTransaction(db, id).then(setIncome);
  }, [db, id]);

  // Valor inicial: o que sobra no mês, limitado ao que entrou. O usuário ajusta depois.
  useEffect(() => {
    if (!view || !income || seeded.current) return;
    seeded.current = true;
    const start = Math.min(income.amount, view.defaultAmount);
    setText(toField(start));
    setForced(start);
  }, [view, income]);

  const done = async () => {
    if (id) await markHandled(db, id);
    router.back();
  };

  if (!income) return <Screen title="Onde investir"><Label>Carregando…</Label></Screen>;
  const cat = categoryById(income.categoryId);
  const parts = view ? buildParts(view) : [];
  const cents = parseBRL(text);

  return (
    <Screen title="Onde investir">
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{income.description || cat.name} · {brDate(income.date)}</Text>
        <Text style={styles.cardValue}>{formatBRL(income.amount, { cents: true })}</Text>
      </View>

      <Field
        label="Quanto investir deste valor"
        value={text}
        keyboardType="decimal-pad"
        placeholder="0,00"
        onChangeText={setText}
        onEndEditing={() => setForced(cents !== null && cents >= 0 ? cents : 0)}
      />
      <Muted>Sugerido: o que sobra no mês depois dos gastos e contas, sem passar do que entrou.</Muted>
      {cents !== null && cents > income.amount ? <Label>Isso é mais do que entrou.</Label> : null}

      <Section>Divisão sugerida</Section>
      {view && parts.length === 0 ? <Label>Sem sobra para investir agora. Ajuste o valor acima se quiser simular.</Label> : null}
      {view?.recommendation.plan.warnings.includes('reserva-baixa') ? (
        <Muted>Sua reserva está abaixo de 6 meses, então ela vem primeiro.</Muted>
      ) : null}
      {parts.map((p) => (
        <View key={p.key} style={styles.part}>
          <View style={styles.partHead}>
            <Text style={styles.partLabel}>{p.label}</Text>
            {p.key.startsWith('mix') ? null : <Text style={styles.partValue}>{formatBRL(p.amount)}</Text>}
          </View>
          {p.lines.map((l, i) => <Text key={i} style={styles.partLine}>{l}</Text>)}
        </View>
      ))}
      {view?.noData ? <Muted>Sem taxas em cache. Abra a aba Investir com internet para atualizar.</Muted> : null}

      <Button label="Já investi — registrar em Meus dados" onPress={async () => { await done(); router.push('/dados'); }} />
      <Button label="Ver na aba Investir" kind="soft" onPress={async () => { await done(); router.replace('/investir'); }} />
      <Button label="Dispensar" kind="soft" onPress={done} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.primary, borderRadius: 24, padding: 20, gap: 4 },
  cardLabel: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint },
  cardValue: { fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.onPrimary },
  part: { backgroundColor: tokens.color.surfaceTint, borderRadius: 18, padding: 16, gap: 4 },
  partHead: { flexDirection: 'row', justifyContent: 'space-between' },
  partLabel: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.text, flexShrink: 1 },
  partValue: { fontFamily: tokens.font.bodySemi, fontSize: 16, color: tokens.color.text },
  partLine: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
});
