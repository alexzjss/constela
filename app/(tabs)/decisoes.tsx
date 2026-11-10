import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../src/theme/tokens';

export default function Decisoes() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Em breve</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.surface },
  text: { fontFamily: tokens.font.display, fontSize: 24, color: tokens.color.text },
});
