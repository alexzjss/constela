import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Label, Muted, Row, Screen, Section, toField } from '../src/components/form';
import { categoryById } from '../src/domain/categories';
import type { Transaction } from '../src/domain/types';
import { getMonthSnapshot, listHoldings, saveMonthSnapshot } from '../src/db/ledger';
import { listTransactions } from '../src/db/repo';
import { investedInMonth, summarizeHoldings } from '../src/engine/holdings';
import { incomeBreakdown } from '../src/engine/income';
import { monthOf, monthNamePt, nextMonth, prevMonth, todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const label = (m: string) => `${monthNamePt(m)} ${m.slice(0, 4)}`;
const sum = (txs: Transaction[], pred: (t: Transaction) => boolean) => txs.filter(pred).reduce((a, t) => a + t.amount, 0);

export default function Mes() {
  const db = useDb();
  const router = useRouter();
  const current = monthOf(todayLocal());
  const [month, setMonth] = useState(current);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState('');
  const [invested, setInvested] = useState('');
  const [holdingsValue, setHoldingsValue] = useState(0);

  const load = useCallback(async (m: string) => {
    setTxs(await listTransactions(db, `${m}-01`, `${m}-31`));
    const snap = await getMonthSnapshot(db, m);
    setBalance(snap.accountBalance !== null ? toField(snap.accountBalance) : '');
    setInvested(snap.invested !== null ? toField(snap.invested) : '');
    setHoldingsValue(summarizeHoldings(await listHoldings(db)).value);
  }, [db]);

  useFocusEffect(useCallback(() => { void load(month); }, [load, month]));

  const saveSnapshot = async () => {
    const b = balance.trim() === '' ? null : parseBRL(balance);
    const i = invested.trim() === '' ? null : parseBRL(invested);
    await saveMonthSnapshot(db, { month, accountBalance: b, invested: i });
  };

  const income = incomeBreakdown(txs, month);
  const spent = sum(txs, (t) => t.kind === 'expense');
  const toInvest = investedInMonth(txs, month);
  const leftover = income.total - spent;

  return (
    <Screen title="Mês a mês">
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => setMonth(prevMonth(month))} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{label(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          disabled={month >= current}
          onPress={() => setMonth(nextMonth(month))}
          style={[styles.arrow, month >= current && { opacity: 0.3 }]}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Line name="Ganhos" value={formatBRL(income.total)} />
        <Line name="Gastos" value={formatBRL(spent)} />
        <Line name="Investido no mês" value={formatBRL(toInvest)} />
        <Line name="Sobrou" value={formatBRL(leftover)} strong />
      </View>
      {income.byType.length > 0 ? (
        <Muted>
          {income.byType.map((b) => `${categoryById(b.categoryId).name} ${formatBRL(b.amount)}`).join(' · ')}
        </Muted>
      ) : null}

      <Section>Fotografia do mês</Section>
      <Field label="Saldo na conta no fim do mês" value={balance} onChangeText={setBalance} onEndEditing={saveSnapshot} keyboardType="decimal-pad" placeholder="0,00" />
      <Field
        label="Total investido no fim do mês"
        value={invested}
        onChangeText={setInvested}
        onEndEditing={saveSnapshot}
        keyboardType="decimal-pad"
        placeholder={month === current && holdingsValue > 0 ? toField(holdingsValue) : '0,00'}
      />
      <Muted>
        {month === current
          ? 'No mês atual, em branco vale a soma dos seus investimentos em Meus dados.'
          : 'Digite o que o app do banco mostrava no último dia do mês.'}
      </Muted>

      <Section>Lançamentos</Section>
      {txs.length === 0 ? <Label>Nada lançado neste mês.</Label> : null}
      {txs.map((t) => {
        const c = categoryById(t.categoryId);
        const sign = t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : '';
        return (
          <Row
            key={t.id}
            color={c.color}
            title={t.description || c.name}
            sub={`${t.date.slice(8, 10)}/${t.date.slice(5, 7)} · ${c.name}`}
            right={`${sign}${formatBRL(t.amount, { cents: true })}`}
            onPress={() => router.push({ pathname: '/lancamento', params: { id: t.id } })}
          />
        );
      })}
      <Button label="Adicionar lançamento" onPress={() => router.push({ pathname: '/lancamento', params: { month } })} />
    </Screen>
  );
}

function Line({ name, value, strong }: { name: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineName, strong && styles.strong]}>{name}</Text>
      <Text style={[styles.lineValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: tokens.color.primary },
  month: { fontFamily: tokens.font.display, fontSize: 22, color: tokens.color.text, textTransform: 'capitalize' },
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: 22, padding: 16, gap: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineName: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.text },
  lineValue: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.text },
  strong: { fontFamily: tokens.font.display, fontSize: 18 },
});
