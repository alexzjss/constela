import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Label, Muted, Row, Screen, Section, toField } from '../../src/components/form';
import { MonthNav } from '../../src/components/MonthNav';
import { categoryById } from '../../src/domain/categories';
import type { IncomeSource, IncomeType, Transaction } from '../../src/domain/types';
import { addIncomeSource, deleteIncomeSource, listIncomeSources, updateIncomeSource } from '../../src/db/ledger';
import { listTransactions } from '../../src/db/repo';
import { expectedFromSources, incomeBreakdown, INCOME_TYPES, incomeTypeLabel } from '../../src/engine/income';
import { loadHandled, pendingIncomes } from '../../src/features/invest/entrada';
import { materializeIncome } from '../../src/features/ledger/actions';
import { addDays, monthOf, todayLocal } from '../../src/lib/dates';
import { useDb } from '../../src/lib/db-context';
import { formatBRL, parseBRL } from '../../src/lib/money';
import { tokens } from '../../src/theme/tokens';

const BR_MONTH = /^(\d{2})\/(\d{4})$/;
const fromMonth = (t: string): string | null => {
  const m = BR_MONTH.exec(t);
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${m[1]}` : null;
};
const toMonth = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const isRecurring = (t: Transaction) => t.externalId?.startsWith('inc:') ?? false;

export default function Ganhos() {
  const db = useDb();
  const router = useRouter();
  const today = todayLocal();
  const current = monthOf(today);

  const [month, setMonth] = useState(current);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<IncomeType>('salario');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('5');
  const [start, setStart] = useState(toMonth(current));
  const [end, setEnd] = useState('');
  const [active, setActive] = useState(true);

  const reload = useCallback(async () => {
    setSources(await listIncomeSources(db));
    setTxs(await listTransactions(db, `${month}-01`, `${month}-31`));
    const recent = await listTransactions(db, addDays(today, -10), today);
    setPending(pendingIncomes(recent, await loadHandled(db), today));
  }, [db, month, today]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const cents = parseBRL(amount);
  const dueDay = Number(day);
  const startMonth = fromMonth(start);
  const endMonth = end.trim() === '' ? null : fromMonth(end);
  const rangeOk = startMonth !== null && (end.trim() === '' || (endMonth !== null && endMonth >= startMonth));
  const canSave = cents !== null && cents > 0 && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 && rangeOk;

  const closeForm = () => {
    setEditing(null); setFormOpen(false); setType('salario'); setName(''); setAmount(''); setDay('5');
    setStart(toMonth(current)); setEnd(''); setActive(true);
  };
  const pick = (s: IncomeSource) => {
    setEditing(s); setFormOpen(true); setType(s.type); setName(s.name); setAmount(toField(s.amount)); setDay(String(s.day));
    setStart(toMonth(s.startMonth)); setEnd(s.endMonth ? toMonth(s.endMonth) : ''); setActive(s.active);
  };

  const save = async () => {
    const input = {
      name: name.trim() || incomeTypeLabel(type), type, amount: cents as number, day: dueDay,
      startMonth: startMonth as string, endMonth, active,
    };
    if (editing) await updateIncomeSource(db, { ...editing, ...input });
    else await addIncomeSource(db, input);
    await materializeIncome(db, today); // se o dia já passou neste mês, entra agora
    closeForm();
    await reload();
  };

  const received = incomeBreakdown(txs, month);
  const expected = expectedFromSources(sources, month);
  const occasional = txs.filter((t) => t.kind === 'income' && !isRecurring(t));

  return (
    <Screen title="Ganhos" back={false}>
      {pending.length > 0 ? (
        <>
          <Section>Para investir</Section>
          {pending.map((t) => (
            <Row
              key={t.id}
              color={categoryById(t.categoryId).color}
              title={`${t.description || categoryById(t.categoryId).name}`}
              sub="Ver onde investir"
              right={formatBRL(t.amount)}
              onPress={() => router.push({ pathname: '/entrada', params: { id: t.id } })}
            />
          ))}
        </>
      ) : null}

      <MonthNav month={month} current={current} onChange={setMonth} />
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Entrou no mês</Text>
        <Text style={styles.cardValue}>{formatBRL(received.total)}</Text>
        <Text style={styles.cardSub}>
          {expected > 0 ? `Esperado das fontes fixas: ${formatBRL(expected)}` : 'Cadastre seus ganhos fixos abaixo'}
          {received.byType.length ? `\n${received.byType.map((b) => `${categoryById(b.categoryId).name} ${formatBRL(b.amount)}`).join(' · ')}` : ''}
        </Text>
      </View>

      <Section>Recorrentes</Section>
      <Muted>Salário, bolsa, rendimentos que caem todo mês. O app lança sozinho no dia combinado.</Muted>
      {sources.length === 0 ? <Label>Nenhum ainda.</Label> : null}
      {sources.map((s) => (
        <Row
          key={s.id}
          color={categoryById(s.type).color}
          title={s.name}
          sub={`${incomeTypeLabel(s.type)} · dia ${s.day} · desde ${toMonth(s.startMonth)}${s.endMonth ? ` até ${toMonth(s.endMonth)}` : ''}${s.active ? '' : ' · pausado'}`}
          right={formatBRL(s.amount)}
          onPress={() => pick(s)}
        />
      ))}
      {!formOpen ? <Button label="Novo ganho recorrente" kind="soft" onPress={() => setFormOpen(true)} /> : null}

      {formOpen ? (
        <View style={styles.form}>
          <Label>{editing ? `Editar ${editing.name}` : 'Novo ganho recorrente'}</Label>
          <Chips<IncomeType> options={INCOME_TYPES} value={type} onChange={setType} />
          <Field label="Nome" value={name} onChangeText={setName} placeholder={type === 'bolsa' ? 'Bolsa de iniciação' : 'Estágio'} />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field label="Valor por mês" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="1.600,00" />
            </View>
            <View style={styles.day}>
              <Field label="Dia" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field label="Começa em" value={start} onChangeText={setStart} keyboardType="number-pad" maxLength={7} placeholder="mm/aaaa" />
            </View>
            <View style={styles.flex}>
              <Field label="Termina em (opcional)" value={end} onChangeText={setEnd} keyboardType="number-pad" maxLength={7} placeholder="mm/aaaa" />
            </View>
          </View>
          {editing ? (
            <Chips
              options={[{ id: 'on', label: 'Ativo' }, { id: 'off', label: 'Pausado' }]}
              value={active ? 'on' : 'off'}
              onChange={(v) => setActive(v === 'on')}
            />
          ) : null}
          <Muted>Mudar o valor vale para os próximos meses. O que já caiu se corrige na lista abaixo.</Muted>
          <Button label={editing ? 'Salvar alterações' : 'Adicionar'} disabled={!canSave} onPress={save} />
          {editing ? (
            <Button
              label="Excluir (mantém o que já entrou)"
              kind="danger"
              onPress={async () => { await deleteIncomeSource(db, editing.id); closeForm(); await reload(); }}
            />
          ) : null}
          <Button label="Cancelar" kind="soft" onPress={closeForm} />
        </View>
      ) : null}

      <Section>Ocasionais</Section>
      <Muted>Freelas, presentes, rendimentos avulsos. Os recorrentes que já caíram aparecem em Início.</Muted>
      {occasional.length === 0 ? <Label>Nenhum neste mês.</Label> : null}
      {occasional.map((t) => (
        <Row
          key={t.id}
          color={categoryById(t.categoryId).color}
          title={t.description || categoryById(t.categoryId).name}
          sub={`${t.date.slice(8, 10)}/${t.date.slice(5, 7)} · ${categoryById(t.categoryId).name}`}
          right={`+${formatBRL(t.amount, { cents: true })}`}
          onPress={() => router.push({ pathname: '/adicionar', params: { id: t.id } })}
        />
      ))}
      <Button label="Novo ganho" onPress={() => router.push({ pathname: '/adicionar', params: { kind: 'income', month } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.primary, borderRadius: 24, padding: 20, gap: 4 },
  cardLabel: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint },
  cardValue: { fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.onPrimary },
  cardSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.primaryTint },
  form: { gap: 12, backgroundColor: tokens.color.surfaceTint, borderRadius: 22, padding: 16 },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  day: { width: 84 },
});
