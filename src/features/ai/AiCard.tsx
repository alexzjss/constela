import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chips } from '../../components/form';
import { loadAiConfig } from '../../ai/config';
import { AiError, askAi, type AiConfig } from '../../ai/provider';
import { useDb } from '../../lib/db-context';
import { tokens } from '../../theme/tokens';

export interface QuickQuestion {
  id: string;
  label: string;
  question: string;
}

/** Pergunta à IA com o resumo numérico (`context`) que o app já calculou. Sem chave, orienta a configurar. */
export function AiCard({ title = 'Perguntar à IA', context, quick }: { title?: string; context: () => string; quick: QuickQuestion[] }) {
  const db = useDb();
  const router = useRouter();
  const [cfg, setCfg] = useState<AiConfig | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { void loadAiConfig(db).then(setCfg); }, [db]));

  const ask = async (question: string) => {
    if (!cfg || !question.trim() || busy) return;
    setBusy(true); setError(null); setAnswer(null);
    try {
      setAnswer(await askAi(cfg, question.trim(), context(), fetch));
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Não consegui consultar a IA.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {cfg === null ? (
        <>
          <Text style={styles.muted}>Opcional. Cole sua chave do Claude ou do Gemini em Ajustes para a IA explicar os números do app. Sem ela, tudo continua funcionando.</Text>
          <Button label="Configurar IA" kind="soft" onPress={() => router.push('/ajustes')} />
        </>
      ) : cfg === undefined ? null : (
        <>
          <Chips<string> options={quick.map((q) => ({ id: q.id, label: q.label }))} value="" onChange={(id) => { const q = quick.find((x) => x.id === id); if (q) { setText(q.question); void ask(q.question); } }} />
          <TextInput
            accessibilityLabel="Pergunta para a IA"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Pergunte sobre estes números"
            placeholderTextColor="#8E99A8"
            multiline
          />
          <Button label={busy ? 'Pensando…' : 'Perguntar'} disabled={busy || !text.trim()} onPress={() => ask(text)} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {answer ? <Text selectable style={styles.answer}>{answer}</Text> : null}
          <Text style={styles.muted}>Os números acima são enviados ao provedor ({cfg.provider === 'claude' ? 'Anthropic' : 'Google'}). A IA só explica; não decide por você.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceTint, borderRadius: tokens.radius.md, padding: 16, marginTop: 16, gap: 10 },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted },
  input: {
    minHeight: 52, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: tokens.color.surface,
    fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.text,
  },
  answer: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.text, lineHeight: 22 },
  error: { fontFamily: tokens.font.bodyMedium, fontSize: 13, color: '#C62828' },
});
