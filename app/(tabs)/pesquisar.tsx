import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Muted, Row, Section } from '../../src/components/form';
import { CLASS_LABEL } from '../../src/features/invest/PlanCard';
import { Disclaimer } from '../../src/features/invest/Disclaimer';
import { loadWatchlist, type WatchItem } from '../../src/features/research/watchlist';
import { CURATED_ASSETS } from '../../src/invest/assets';
import { searchSymbols, type SearchHit } from '../../src/invest/sources/yahooSearch';
import { useDb } from '../../src/lib/db-context';
import { tokens } from '../../src/theme/tokens';

export default function Pesquisar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [watch, setWatch] = useState<WatchItem[]>([]);

  useFocusEffect(useCallback(() => { void loadWatchlist(db).then(setWatch); }, [db]));

  // Espera o usuário parar de digitar; uma busca antiga que volta tarde não sobrescreve a nova.
  useEffect(() => {
    if (text.trim().length < 2) { setHits(null); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchSymbols(fetch, text);
      if (!cancelled) { setHits(r); setSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [text]);

  const open = (symbol: string, name: string, cls: string) =>
    router.push({ pathname: '/ativo', params: { symbol, name, cls } });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Pesquisar</Text>
      <TextInput
        accessibilityLabel="Buscar ativo"
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ticker ou nome: PETR4, Itaú, VOO, bitcoin"
        placeholderTextColor="#8E99A8"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {hits !== null ? (
        <View style={styles.list}>
          <Section>Resultados</Section>
          {hits.length === 0 ? <Muted>{searching ? 'Buscando…' : 'Nada encontrado. Confira o ticker ou a conexão.'}</Muted> : null}
          {hits.map((h) => (
            <Row key={h.symbol} title={h.name} sub={`${h.symbol} · ${h.exchange || h.kind} · ${CLASS_LABEL[h.cls]}`} onPress={() => open(h.symbol, h.name, h.cls)} />
          ))}
        </View>
      ) : (
        <>
          <View style={styles.list}>
            <Section>Acompanhando</Section>
            {watch.length === 0 ? <Muted>Abra um ativo e toque em "Acompanhar" para ele entrar nas comparações.</Muted> : null}
            {watch.map((w) => (
              <Row key={w.symbol} title={w.name} sub={`${w.symbol} · ${CLASS_LABEL[w.cls]}`} onPress={() => open(w.symbol, w.name, w.cls)} />
            ))}
          </View>
          <View style={styles.list}>
            <Section>Para começar</Section>
            <Muted>Grandes e líquidos, só como ponto de partida. Não é recomendação de compra.</Muted>
            {CURATED_ASSETS.map((a) => (
              <Row key={a.symbol} title={a.name} sub={`${a.symbol} · ${CLASS_LABEL[a.cls]}`} onPress={() => open(a.symbol, a.name, a.cls)} />
            ))}
          </View>
        </>
      )}
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.surface },
  content: { paddingHorizontal: 20, gap: 12 },
  title: { fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text },
  input: {
    height: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: tokens.color.surfaceTint,
    fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.text,
  },
  list: { gap: 8 },
});
