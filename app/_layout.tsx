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
          <Stack.Screen name="ajustes" />
          <Stack.Screen name="conta" />
        </Stack>
      </DbProvider>
    </SafeAreaProvider>
  );
}
