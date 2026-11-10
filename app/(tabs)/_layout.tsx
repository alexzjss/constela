import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ganhos" />
      <Tabs.Screen name="investimentos" />
    </Tabs>
  );
}
