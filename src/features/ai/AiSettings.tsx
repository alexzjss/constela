import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Button, Chips, Field, Muted, Section } from '../../components/form';
import { loadAiSettings, removeKey, saveKey, saveModel, saveProvider, type AiSettings as Settings } from '../../ai/config';
import { PROVIDERS, type Provider } from '../../ai/provider';
import { useDb } from '../../lib/db-context';

/** Provedor, modelo e chave da IA. A chave vai para o cofre do Android e nunca aparece de volta. */
export function AiSettings() {
  const db = useDb();
  const [s, setS] = useState<Settings | null>(null);
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await loadAiSettings(db);
    setS(next);
    setModel(next.model);
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!s) return null;
  const pick = async (p: Provider) => { await saveProvider(db, p); setKey(''); setMsg(null); await load(); };

  return (
    <>
      <Section>IA (opcional)</Section>
      <Muted>Com a sua chave, a IA explica a carteira, a sugestão e cada ativo. Ao perguntar, o resumo dos seus números vai ao provedor escolhido. Nada é enviado sem você tocar em Perguntar.</Muted>
      <Chips<Provider> options={PROVIDERS.map((p) => ({ id: p.id, label: p.label }))} value={s.provider} onChange={pick} />
      <Field label="Modelo" value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false}
        onEndEditing={async () => { await saveModel(db, s.provider, model); await load(); }} />
      <Field label={s.hasKey ? 'Chave salva. Cole outra para trocar' : 'Chave da API'} value={key} onChangeText={setKey}
        secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder={s.hasKey ? '••••••••' : 'cole aqui'} />
      <Button label="Salvar chave" kind="soft" disabled={key.trim().length < 8}
        onPress={async () => { await saveKey(s.provider, key); setKey(''); setMsg('Chave guardada no cofre do aparelho.'); await load(); }} />
      {s.hasKey ? (
        <Button label="Remover chave" kind="danger" onPress={async () => { await removeKey(s.provider); setMsg('Chave removida.'); await load(); }} />
      ) : null}
      {msg ? <Muted>{msg}</Muted> : null}
    </>
  );
}
