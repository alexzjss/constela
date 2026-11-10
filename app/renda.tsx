import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Label, Muted, Row, Screen, Section, toField } from '../src/components/form';
import { categoryById } from '../src/domain/categories';
import type { IncomeSource, IncomeType, Transaction } from '../src/domain/types';
import { addIncomeSource, deleteIncomeSource, listIncomeSources, updateIncomeSource } from '../src/db/ledger';
import { listTransactions } from '../src/db/repo';
import { expectedFromSources, incomeBreakdown, INCOME_TYPES, incomeTypeLabel } from '../src/engine/income';
import { materializeIncome } from '../src/features/ledger/actions';
import { monthNamePt, monthOf, todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const BR_MONTH = /^(\d{2})\/(\d{4})$/;
const fromMonth = (t: string): string | null => {
  const m = BR_MONTH.exec(t);
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${m[1]}` : null;
};
const toMonth = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

export default function Renda() {
  const db = useDb();
  const router = useRouter();
  const today = todayLocal();
  const current = monthOf(today);

  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [type, setType] = useState<IncomeType>('salario');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('5');
  const [start, setStart] = useState(toMonth(current));
  const [end, setEnd] = useState('');
  const [active, setActive] = useState(true);

  const reload = useCallback(async () => {
    setSources(await listIncomeSources(db));
    setTxs(await listTransactions(db, `${current}-01`, `${current}-31`));
  }, [db, current]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const cents = parseBRL(amount);
  const dueDay = Number(day);
  const startMonth = fromMonth(start);
  const endMonth = end.trim() === '' ? null : fromMonth(end);
  const rangeOk = startMonth !== null && (end.trim() === '' || (endMonth !== null && endMonth >= startMonth));
  const canSave = cents !== null && cents > 0 && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 && rangeOk;

  const clear = () => {
    setEditing(null); setType('salario'); setName(''); setAmount(''); setDay('5');
    setStart(toMonth(current)); setEnd(''); setActive(true);
  };
  const pick = (s: IncomeSource) => {
    setEditing(s); setType(s.type); setName(s.name); setAmount(toField(s.amount)); setDay(String(s.day));
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
    clear();
    await reload();
  };

  const received = incomeBreakdown(txs, current);
  const expected = expectedFromSources(sources, current);

  return (
    <Screen title="Ganhos e salários">
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Entrou em {monthNamePt(current)}</Text>
        <Text style={styles.cardValue}>{formatBRL(received.total)}</Text>
        <Text style={styles.cardSub}>
          {expected > 0 ? `Esperado das fontes fixas: ${formatBRL(expected)}` : 'Cadastre seus ganhos fixos abaixo'}
          {received.byType.length ? `\n${received.byType.map((b) => `${categoryById(b.categoryId).name} ${formatBRL(b.amount)}`).join(' · ')}` : ''}
        </Text>
      </View>
      <Button label="Registrar ganho avulso" kind="soft" onPress={() => router.push({ pathname: '/lancamento', params: { kind: 'income' } })} />

      <Section>Ganhos recorrentes</Section>
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

      <Section>{editing ? `Editar ${editing.name}` : 'Novo ganho recorrente'}</Section>
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
      <Muted>Mudar o valor vale para os próximos meses. O que já foi lançado se edita em Mês a mês.</Muted>
      <Button label={editing ? 'Salvar alterações' : 'Adicionar'} disabled={!canSave} onPress={save} />
      {editing ? (
        <>
          <Button label="Cancelar edição" kind="soft" onPress={clear} />
          <Button
            label="Excluir (mantém o que já entrou)"
            kind="danger"
            onPress={async () => { await deleteIncomeSource(db, editing.id); clear(); await reload(); }}
          />
        </>
      ) : null}
      <Button label="Ver mês a mês" kind="soft" onPress={() => router.push('/mes')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.primary, borderRadius: 24, padding: 20, gap: 4 },
  cardLabel: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint, textTransform: 'capitalize' },
  cardValue: { fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.onPrimary },
  cardSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.primaryTint },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  day: { width: 84 },
});
