import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="carteira" />
      <Tabs.Screen name="pesquisar" />
      <Tabs.Screen name="companheiro" />
    </Tabs>
  );
}
