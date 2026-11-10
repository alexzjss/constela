import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Label, Muted, Row, toField } from '../../components/form';
import { deleteHolding, updateHolding } from '../../db/holdings';
import type { Holding, HoldingType } from '../../domain/types';
import { HOLDING_TYPES, holdingTypeLabel } from '../../engine/holdings';
import { fromBR, isRealDate, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';
import { formatBRL, parseBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';
import { createHolding, moveHolding } from './actions';
import type { HoldingRow, HoldingsView } from './holdingsView';

const pct = (r: number | null) => (r === null ? '' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1).replace('.', ',')}%`);
const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const signed = (c: number) => `${c >= 0 ? '+' : '−'}${formatBRL(Math.abs(c))}`;

/** Resumo, posições com rendimento e a criação de novas. Aporte/resgate/valor são feitos na própria linha. */
export function HoldingsSection({ view, onChange }: { view: HoldingsView; onChange(): void }) {
  const db = useDb();
  const today = todayLocal();
  const [openId, setOpenId] = useState<string | null>(null);
  const [move, setMove] = useState('');
  const [value, setValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<HoldingType>('tesouro');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [invested, setInvested] = useState('');
  const [current, setCurrent] = useState('');
  const [since, setSince] = useState(brDate(today));

  const moveC = parseBRL(move);
  const valueC = parseBRL(value);
  const investedC = parseBRL(invested);
  const currentC = parseBRL(current);
  const sinceIso = /^\d{2}\/\d{2}\/\d{4}$/.test(since) ? fromBR(since) : null;
  const canCreate = name.trim().length > 0 && investedC !== null && investedC > 0 && currentC !== null && currentC >= 0
    && sinceIso !== null && isRealDate(sinceIso) && sinceIso <= today;

  const open = (r: HoldingRow) => {
    setOpenId(openId === r.holding.id ? null : r.holding.id);
    setMove(''); setValue(toField(r.holding.value));
  };
  const act = async (fn: () => Promise<unknown>) => { await fn(); setMove(''); onChange(); };
  const total = view.total;

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Investido hoje</Text>
        <Text style={styles.heroValue}>{formatBRL(view.summary.value)}</Text>
        <Text style={styles.heroSub}>
          {total
            ? `${formatBRL(total.contributed)} aportados · rendimento ${signed(total.gain)} ${pct(total.gainPct)}`
            : view.summary.value > 0 ? 'Sem histórico de aportes ainda' : 'Nada cadastrado ainda'}
        </Text>
        {total ? <Text style={styles.heroSub}>{totalLine(total)}</Text> : null}
      </View>

      {view.rows.map((r) => {
        const h = r.holding;
        const isOpen = openId === h.id;
        return (
          <View key={h.id} style={styles.wrap}>
            <Row
              title={h.name}
              sub={`${holdingTypeLabel(h.type)}${r.since ? ` · desde ${brDate(r.since)}` : ''}`}
              right={formatBRL(h.value)}
              rightSub={`${signed(r.perf.gain)} ${pct(r.perf.gainPct)}`}
              onPress={() => open(r)}
            />
            {isOpen ? (
              <View style={styles.detail}>
                <Text style={styles.headline}>{r.headline}</Text>
                {r.perf.cdiValue !== null ? <Muted>No CDI o mesmo fluxo valeria {formatBRL(r.perf.cdiValue)}.</Muted> : null}
                {r.perf.ipcaValue !== null ? <Muted>Só corrigido pela inflação: {formatBRL(r.perf.ipcaValue)}.</Muted> : null}
                <Field label="Valor do aporte ou resgate" value={move} onChangeText={setMove} keyboardType="decimal-pad" placeholder="200,00" />
                <View style={styles.pair}>
                  <View style={styles.flex}><Button label="Aportar" kind="soft" disabled={!moveC || moveC <= 0} onPress={() => act(() => moveHolding(db, h, 'aporte', moveC as number, today))} /></View>
                  <View style={styles.flex}><Button label="Resgatar" kind="soft" disabled={!moveC || moveC <= 0} onPress={() => act(() => moveHolding(db, h, 'resgate', moveC as number, today))} /></View>
                </View>
                <Field label="Vale hoje (corrige o rendimento)" value={value} onChangeText={setValue} keyboardType="decimal-pad" />
                <Button
                  label="Atualizar valor"
                  kind="soft"
                  disabled={valueC === null || valueC < 0}
                  onPress={() => act(() => updateHolding(db, { ...h, value: valueC as number, updatedAt: today }))}
                />
                <Button label="Excluir posição" kind="danger" onPress={() => act(async () => { await deleteHolding(db, h.id); setOpenId(null); })} />
              </View>
            ) : null}
          </View>
        );
      })}

      {!creating ? <Button label="Nova posição" kind="soft" onPress={() => setCreating(true)} /> : (
        <View style={styles.detail}>
          <Label>Nova posição</Label>
          <Chips<HoldingType> options={HOLDING_TYPES} value={type} onChange={setType} />
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Tesouro Selic 2029" />
          <Field label="Símbolo do ativo (opcional)" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" autoCorrect={false} placeholder="PETR4.SA" />
          <Muted>Com o símbolo, a posição entra nos cálculos de risco e correlação. Busque o símbolo certo na aba Pesquisar.</Muted>
          <View style={styles.pair}>
            <View style={styles.flex}><Field label="Aportado" value={invested} onChangeText={setInvested} keyboardType="decimal-pad" placeholder="1.000,00" /></View>
            <View style={styles.flex}><Field label="Vale hoje" value={current} onChangeText={setCurrent} keyboardType="decimal-pad" placeholder="1.050,00" /></View>
          </View>
          <Field label="Desde quando" value={since} onChangeText={setSince} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/aaaa" />
          <Muted>A data é de quando o dinheiro entrou. Com ela o app compara o rendimento com o CDI.</Muted>
          <Button
            label="Adicionar"
            disabled={!canCreate}
            onPress={async () => {
              await createHolding(db, { type, name: name.trim(), invested: investedC as number, value: currentC as number, symbol: symbol.trim() || null }, today, sinceIso as string);
              setCreating(false); setName(''); setSymbol(''); setInvested(''); setCurrent(''); setSince(brDate(today));
              onChange();
            }}
          />
          <Button label="Cancelar" kind="soft" onPress={() => setCreating(false)} />
        </View>
      )}
    </View>
  );
}

function totalLine(t: NonNullable<HoldingsView['total']>): string {
  if (t.verdict === 'cedo') return 'Ainda cedo para comparar com o CDI.';
  if (t.vsCdi === null) return 'Sem taxas para comparar com o CDI.';
  const diff = formatBRL(Math.abs(t.vsCdi));
  return `${t.vsCdi >= 0 ? `${diff} acima` : `${diff} abaixo`} do CDI${t.estimated ? ' (estimativa)' : ''}${t.beatsInflation === false ? ' · abaixo da inflação' : ''}`;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  hero: { backgroundColor: tokens.color.primary, borderRadius: 24, padding: 20, gap: 4 },
  heroLabel: { fontFamily: tokens.font.bodyMedium, fontSize: 14, color: tokens.color.primaryTint },
  heroValue: { fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.onPrimary },
  heroSub: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.primaryTint },
  detail: { gap: 12, backgroundColor: tokens.color.surfaceTint, borderRadius: 22, padding: 16 },
  headline: { fontFamily: tokens.font.bodySemi, fontSize: 15, color: tokens.color.text },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
