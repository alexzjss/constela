import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Label, Muted, Row, Screen, Section, toField } from '../src/components/form';
import { deleteHolding, listHoldings, updateHolding } from '../src/db/ledger';
import { deleteSetting, getSetting, setSetting } from '../src/db/repo';
import type { Holding, HoldingType } from '../src/domain/types';
import { gainPct, HOLDING_TYPES, holdingTypeLabel, summarizeHoldings } from '../src/engine/holdings';
import { createHolding, moveHolding } from '../src/features/ledger/actions';
import { todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { formatBRL, parseBRL } from '../src/lib/money';
import { tokens } from '../src/theme/tokens';

const pct = (r: number | null) => (r === null ? '' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1).replace('.', ',')}%`);

/** Campo de valor que grava ao sair do campo. Em branco apaga o ajuste. */
function MoneySetting({ label, settingKey, hint }: { label: string; settingKey: string; hint?: string }) {
  const db = useDb();
  const [text, setText] = useState('');
  useEffect(() => {
    void getSetting(db, settingKey).then((v) => setText(v !== null && Number(v) > 0 ? toField(Number(v)) : ''));
  }, [db, settingKey]);
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={label}
        value={text}
        keyboardType="decimal-pad"
        placeholder="0,00"
        onChangeText={setText}
        onEndEditing={async () => {
          const c = parseBRL(text);
          if (text.trim() === '') await deleteSetting(db, settingKey);
          else if (c !== null && c >= 0) await setSetting(db, settingKey, String(c));
        }}
      />
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export default function Dados() {
  const db = useDb();
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [type, setType] = useState<HoldingType>('tesouro');
  const [name, setName] = useState('');
  const [invested, setInvested] = useState('');
  const [value, setValue] = useState('');
  const [move, setMove] = useState('');

  const reload = useCallback(async () => setHoldings(await listHoldings(db)), [db]);
  useEffect(() => { void reload(); }, [reload]);

  const today = todayLocal();
  const summary = summarizeHoldings(holdings);
  const investedC = parseBRL(invested);
  const valueC = parseBRL(value);
  const moveC = parseBRL(move);
  const canSave = name.trim().length > 0 && investedC !== null && investedC >= 0 && valueC !== null && valueC >= 0;

  const clear = () => {
    setEditing(null); setName(''); setInvested(''); setValue(''); setMove('');
  };
  const pick = (h: Holding) => {
    setEditing(h); setType(h.type); setName(h.name); setInvested(toField(h.invested)); setValue(toField(h.value)); setMove('');
  };

  const save = async () => {
    const input = { type, name: name.trim(), invested: investedC as number, value: valueC as number };
    if (editing) await updateHolding(db, { ...editing, ...input, updatedAt: today });
    else await createHolding(db, input, today);
    clear();
    await reload();
  };

  const doMove = async (kind: 'aporte' | 'resgate') => {
    if (!editing || !moveC || moveC <= 0) return;
    const next = await moveHolding(db, editing, kind, moveC, today);
    pick(next);
    await reload();
  };

  return (
    <Screen title="Meus dados">
      <Section>Agora</Section>
      <MoneySetting label="Saldo na conta" settingKey="accountBalance" hint="Quanto tem na conta corrente hoje." />
      <MoneySetting label="Reserva de emergência" settingKey="reserveBalance" hint="Entra no score. Em branco, o app estima pela caixinha." />
      <MoneySetting label="Renda mensal esperada" settingKey="monthlyIncome" hint="Em branco, vale a soma dos seus ganhos recorrentes." />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Investido hoje</Text>
        <Text style={styles.totalValue}>{formatBRL(summary.value)}</Text>
        <Text style={styles.totalSub}>
          {summary.invested > 0 ? `${formatBRL(summary.invested)} aportados · ${formatBRL(summary.gain)} de rendimento ${pct(gainPct(summary.invested, summary.value))}` : 'Nada cadastrado ainda'}
        </Text>
      </View>

      <Section>Investimentos</Section>
      {summary.groups.map((g) => (
        <View key={g.type} style={styles.group}>
          <View style={styles.groupHead}>
            <Label>{holdingTypeLabel(g.type)}</Label>
            <Label>{formatBRL(g.value)}</Label>
          </View>
          {g.items.map((h) => (
            <Row
              key={h.id}
              title={h.name}
              sub={`aportado ${formatBRL(h.invested)}`}
              right={formatBRL(h.value)}
              rightSub={pct(gainPct(h.invested, h.value))}
              onPress={() => pick(h)}
            />
          ))}
        </View>
      ))}

      <Section>{editing ? `Editar ${editing.name}` : 'Novo investimento'}</Section>
      <Chips<HoldingType> options={HOLDING_TYPES} value={type} onChange={setType} />
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Tesouro Selic 2029" />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Aportado" value={invested} onChangeText={setInvested} keyboardType="decimal-pad" placeholder="1.000,00" />
        </View>
        <View style={styles.flex}>
          <Field label="Vale hoje" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="1.050,00" />
        </View>
      </View>
      <Muted>Para só corrigir o valor (rendimento), mude “Vale hoje”. Para dinheiro novo, use Aportar abaixo.</Muted>
      <Button label={editing ? 'Salvar alterações' : 'Adicionar'} disabled={!canSave} onPress={save} />

      {editing ? (
        <>
          <Field label="Valor do aporte ou resgate" value={move} onChangeText={setMove} keyboardType="decimal-pad" placeholder="200,00" />
          <View style={styles.pair}>
            <View style={styles.flex}><Button label="Aportar" kind="soft" disabled={!moveC || moveC <= 0} onPress={() => doMove('aporte')} /></View>
            <View style={styles.flex}><Button label="Resgatar" kind="soft" disabled={!moveC || moveC <= 0} onPress={() => doMove('resgate')} /></View>
          </View>
          <Button label="Cancelar edição" kind="soft" onPress={clear} />
          <Button
            label="Excluir investimento"
            kind="danger"
            onPress={async () => { await deleteHolding(db, editing.id); clear(); await reload(); }}
          />
        </>
      ) : null}

      <Section>Mais</Section>
      <Button label="Mês a mês" kind="soft" onPress={() => router.push('/mes')} />
      <Button label="Ganhos e salários" kind="soft" onPress={() => router.push('/renda')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: tokens.color.primary, borderRadius: 24, padding: 20, gap: 4, marginTop: 8 },
  totalLabel: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint },
  totalValue: { fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.onPrimary },
  totalSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.primaryTint },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between' },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
