import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { brDate, Button, Chips, Field, Label, Muted, Screen, Section, toField } from '../src/components/form';
import { categoryById } from '../src/domain/categories';
import type { Holding, HoldingType, Transaction } from '../src/domain/types';
import { listHoldings } from '../src/db/ledger';
import { HOLDING_TYPES } from '../src/engine/holdings';
import { getTransaction } from '../src/db/repo';
import { Disclaimer } from '../src/features/invest/Disclaimer';
import { buildParts, markHandled, type Part } from '../src/features/invest/entrada';
import { useInvest } from '../src/features/invest/useInvest';
import { registerInvestment } from '../src/features/ledger/actions';
import { todayLocal } from '../src/lib/dates';
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
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<string>('new'); // id da posição ou 'new'
  const [newType, setNewType] = useState<HoldingType>('tesouro');
  const [newName, setNewName] = useState('');
  const [partAmount, setPartAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const finish = async () => {
    if (id) await markHandled(db, id);
    router.back();
  };

  const openPart = async (p: Part) => {
    setError(null);
    const hs = await listHoldings(db);
    setHoldings(hs);
    const t = p.target;
    const same = t.kind === 'holding' ? hs.find((h) => h.type === t.type && h.name === t.name) : undefined;
    setPick(same?.id ?? 'new');
    if (t.kind === 'holding') { setNewType(t.type); setNewName(t.name); }
    setPartAmount(toField(p.amount));
    setOpenKey(p.key);
  };

  const confirm = async (p: Part) => {
    const amount = parseBRL(partAmount);
    if (amount === null || amount <= 0) return;
    const today = todayLocal();
    try {
      if (p.target.kind === 'goal') {
        await registerInvestment(db, { kind: 'goal', goalId: p.target.goalId, amount }, today);
      } else if (pick !== 'new') {
        const holding = holdings.find((h) => h.id === pick);
        if (!holding) return;
        await registerInvestment(db, { kind: 'existing', holding, amount }, today);
      } else {
        if (newName.trim() === '') { setError('Dê um nome à posição.'); return; }
        await registerInvestment(db, { kind: 'new', type: newType, name: newName.trim(), amount }, today);
      }
      setDone((d) => new Set(d).add(p.key));
      setOpenKey(null);
    } catch {
      setError('Não consegui registrar. Tente de novo.');
    }
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
      {parts.map((p) => {
        const isDone = done.has(p.key);
        const isOpen = openKey === p.key;
        return (
          <View key={p.key} style={styles.part}>
            <View style={styles.partHead}>
              <Text style={styles.partLabel}>{p.label}</Text>
              {p.key.startsWith('mix') ? null : <Text style={styles.partValue}>{formatBRL(p.amount)}</Text>}
            </View>
            {p.lines.map((l, i) => <Text key={i} style={styles.partLine}>{l}</Text>)}
            {isDone ? <Text style={styles.ok}>✓ Registrado</Text> : null}
            {!isDone && !isOpen ? <Button label={p.target.kind === 'goal' ? 'Guardei na meta' : 'Investi'} kind="soft" onPress={() => openPart(p)} /> : null}
            {isOpen ? (
              <View style={styles.form}>
                {p.target.kind === 'holding' ? (
                  <>
                    <Label>Em qual posição?</Label>
                    <Chips<string>
                      options={[...holdings.map((h) => ({ id: h.id, label: h.name })), { id: 'new', label: 'Nova posição' }]}
                      value={pick}
                      onChange={setPick}
                    />
                    {pick === 'new' ? (
                      <>
                        <Chips<HoldingType> options={HOLDING_TYPES} value={newType} onChange={setNewType} />
                        <Field label="Nome da posição" value={newName} onChangeText={setNewName} placeholder="Tesouro Selic 2029" />
                      </>
                    ) : null}
                  </>
                ) : null}
                <Field label="Quanto foi investido" value={partAmount} onChangeText={setPartAmount} keyboardType="decimal-pad" />
                {error ? <Label>{error}</Label> : null}
                <Button label="Registrar" disabled={!(parseBRL(partAmount) && (parseBRL(partAmount) as number) > 0)} onPress={() => confirm(p)} />
                <Button label="Cancelar" kind="soft" onPress={() => setOpenKey(null)} />
              </View>
            ) : null}
          </View>
        );
      })}
      {view?.noData ? <Muted>Sem taxas em cache. Abra a aba Investimentos com internet para atualizar.</Muted> : null}

      <Button label={done.size > 0 ? 'Concluir' : 'Dispensar'} onPress={finish} />
      <Button label="Ver meus investimentos" kind="soft" onPress={async () => { await finish(); router.push('/investimentos'); }} />
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
  form: { gap: 12, marginTop: 8 },
  ok: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.primary },
  partLine: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted },
});
