import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ASSET_CLASSES } from '../../engine/invest/types';
import { formatBRL } from '../../lib/money';
import { tokens } from '../../theme/tokens';
import { CLASS_LABEL } from './PlanCard';
import type { AssetRow } from './view';

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1).replace('.', ',')}%`);

export function AssetSection({ assets, onOpen }: { assets: AssetRow[]; onOpen: (ref: string) => void }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Renda variável: indicadores públicos</Text>
      {ASSET_CLASSES.filter((c) => assets.some((a) => a.cls === c)).map((cls) => (
        <View key={cls}>
          <Text style={styles.cls}>{CLASS_LABEL[cls]}</Text>
          {assets.filter((a) => a.cls === cls).map((a) => (
            <Pressable key={a.symbol} accessibilityRole="button" onPress={() => onOpen(`asset:${a.symbol}`)} style={styles.row}>
              <View style={styles.left}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.muted}>12m {pct(a.change12m)} · yield {pct(a.dividendYield)}{a.stale ? ' · desatualizado' : ''}</Text>
              </View>
              <Text style={styles.name}>{a.priceBrl === null ? '—' : formatBRL(a.priceBrl, { cents: true })}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 24 },
  title: { fontFamily: tokens.font.display, fontSize: 18, color: tokens.color.text, marginBottom: 8 },
  cls: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.primaryDark, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E3E7EC' },
  left: { flexShrink: 1, paddingRight: 8 },
  name: { fontFamily: tokens.font.bodySemi, fontSize: 14, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.textMuted },
});
