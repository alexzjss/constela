import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Field, Label, Muted, Row, toField } from '../../components/form';
import { MonthNav } from '../../components/MonthNav';
import { categoryById } from '../../domain/categories';
import type { Transaction } from '../../domain/types';
import { getMonthSnapshot, listHoldings, saveMonthSnapshot } from '../../db/ledger';
import { listTransactions } from '../../db/repo';
import { investedInMonth, summarizeHoldings } from '../../engine/holdings';
import { incomeBreakdown } from '../../engine/income';
import { monthOf, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';
import { formatBRL, parseBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';

/** Mês a mês dentro do Início: resumo, fotografia do fim do mês e lançamentos editáveis. */
export function Ledger() {
  const db = useDb();
  const router = useRouter();
  const current = monthOf(todayLocal());
  const [month, setMonth] = useState(current);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState('');
  const [invested, setInvested] = useState('');
  const [holdingsValue, setHoldingsValue] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (m: string) => {
    setTxs(await listTransactions(db, `${m}-01`, `${m}-31`));
    const snap = await getMonthSnapshot(db, m);
    setBalance(snap.accountBalance !== null ? toField(snap.accountBalance) : '');
    setInvested(snap.invested !== null ? toField(snap.invested) : '');
    setHoldingsValue(summarizeHoldings(await listHoldings(db)).value);
  }, [db]);
  useFocusEffect(useCallback(() => { void load(month); }, [load, month]));

  const saveSnapshot = async () => {
    await saveMonthSnapshot(db, {
      month,
      accountBalance: balance.trim() === '' ? null : parseBRL(balance),
      invested: invested.trim() === '' ? null : parseBRL(invested),
    });
  };

  const income = incomeBreakdown(txs, month);
  const spent = txs.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
  const toInvest = investedInMonth(txs, month);

  return (
    <View style={styles.wrap}>
      <MonthNav month={month} current={current} onChange={setMonth} />
      <View style={styles.card}>
        <Line name="Ganhos" value={formatBRL(income.total)} />
        <Line name="Gastos" value={formatBRL(spent)} />
        <Line name="Investido no mês" value={formatBRL(toInvest)} />
        <Line name="Sobrou" value={formatBRL(income.total - spent)} strong />
      </View>

      <Button label={open ? 'Fechar fotografia do mês' : 'Fotografia do mês (saldo e investido)'} kind="soft" onPress={() => setOpen((o) => !o)} />
      {open ? (
        <View style={styles.wrap}>
          <Field label="Saldo na conta no fim do mês" value={balance} onChangeText={setBalance} onEndEditing={saveSnapshot} keyboardType="decimal-pad" placeholder="0,00" />
          <Field
            label="Total investido no fim do mês"
            value={invested}
            onChangeText={setInvested}
            onEndEditing={saveSnapshot}
            keyboardType="decimal-pad"
            placeholder={month === current && holdingsValue > 0 ? toField(holdingsValue) : '0,00'}
          />
          <Muted>{month === current ? 'No mês atual, em branco vale a soma dos seus investimentos.' : 'O que o app do banco mostrava no último dia do mês.'}</Muted>
        </View>
      ) : null}

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
            // aporte/resgate nasce e se corrige em Investimentos
            onPress={t.kind === 'internal' ? undefined : () => router.push({ pathname: '/adicionar', params: { id: t.id } })}
          />
        );
      })}
      <Button label="Adicionar lançamento neste mês" kind="soft" onPress={() => router.push({ pathname: '/adicionar', params: { month } })} />
    </View>
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
  wrap: { gap: 12 },
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: 22, padding: 16, gap: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineName: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.text },
  lineValue: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.text },
  strong: { fontFamily: tokens.font.display, fontSize: 18 },
});
