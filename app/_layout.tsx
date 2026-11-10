import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Db } from '../src/db/db';
import { openExpoDb } from '../src/db/expo';
import { migrate } from '../src/db/schema';
import { materializeIncome } from '../src/features/ledger/actions';
import { todayLocal } from '../src/lib/dates';
import { DbProvider } from '../src/lib/db-context';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_700Bold,
  });
  const [db, setDb] = useState<Db | null>(null);

  useEffect(() => {
    (async () => {
      const d = await openExpoDb();
      await migrate(d);
      await materializeIncome(d, todayLocal());
      setDb(d);
    })();
  }, []);

  if (!fontsLoaded || !db) return null;
  return (
    <SafeAreaProvider>
      <DbProvider db={db}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="adicionar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ajustes" />
          <Stack.Screen name="contas" />
          <Stack.Screen name="score" />
          <Stack.Screen name="metas" />
          <Stack.Screen name="conta" />
          <Stack.Screen name="dados" />
          <Stack.Screen name="mes" />
          <Stack.Screen name="lancamento" options={{ presentation: 'modal' }} />
          <Stack.Screen name="renda" />
          <Stack.Screen name="entrada" />
        </Stack>
      </DbProvider>
    </SafeAreaProvider>
  );
}
