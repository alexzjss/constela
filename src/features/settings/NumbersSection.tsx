import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Muted, toField } from '../../components/form';
import { rdbNet } from '../../engine/composite';
import { deleteSetting, getSetting, listTransactions, setSetting } from '../../db/repo';
import { useDb } from '../../lib/db-context';
import { formatBRL, parseBRL } from '../../lib/money';

/** Campo de valor que grava ao sair do campo. Em branco apaga o ajuste. */
function MoneySetting({
  label, settingKey, hint, reloadKey,
}: { label: string; settingKey: string; hint?: string; reloadKey: number }) {
  const db = useDb();
  const [text, setText] = useState('');
  useEffect(() => {
    void getSetting(db, settingKey).then((v) => setText(v !== null && Number(v) > 0 ? toField(Number(v)) : ''));
  }, [db, settingKey, reloadKey]);
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

/** Saldo, reserva e renda esperada: os três números que o app usa e que só você sabe. */
export function NumbersSection() {
  const db = useDb();
  const [suggestion, setSuggestion] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const saved = await getSetting(db, 'reserveBalance');
    setSuggestion(saved === null ? rdbNet(await listTransactions(db, '0000-01-01', '9999-12-31')) : 0);
  }, [db]);
  useEffect(() => { void load(); }, [load, reloadKey]);

  return (
    <View style={{ gap: 12 }}>
      <MoneySetting reloadKey={reloadKey} label="Saldo na conta" settingKey="accountBalance" hint="Quanto tem na conta corrente hoje." />
      <MoneySetting reloadKey={reloadKey} label="Reserva de emergência" settingKey="reserveBalance" hint="Entra no score. Em branco, o app estima pela caixinha." />
      {suggestion > 0 ? (
        <Button
          label={`Usar ${formatBRL(suggestion)} da caixinha`}
          kind="soft"
          onPress={async () => { await setSetting(db, 'reserveBalance', String(suggestion)); setReloadKey((k) => k + 1); }}
        />
      ) : null}
      <MoneySetting reloadKey={reloadKey} label="Renda mensal esperada (opcional)" settingKey="monthlyIncome" hint="Em branco, vale a soma dos seus ganhos recorrentes." />
    </View>
  );
}
