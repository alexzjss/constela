import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { tokens } from '../../theme/tokens';

export const DISCLAIMER =
  'Simulação educativa com dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante futura.';

export function Disclaimer() {
  return <Text style={styles.text}>{DISCLAIMER}</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted, marginTop: 16 },
});
