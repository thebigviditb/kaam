import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

const HOUSE = 64; // door houses
const BIG = 96; // the four letter houses in the middle
const GAP = 12;
const STEP = HOUSE + GAP;

const DOOR = require('../../assets/brand/kaam-house-door.png');
const LETTER = {
  K: require('../../assets/brand/kaam-house-K.png'),
  A: require('../../assets/brand/kaam-house-A.png'),
  M: require('../../assets/brand/kaam-house-M.png'),
} as const;
const WORD = ['K', 'A', 'A', 'M'] as const;

/**
 * A street of houses spanning the whole window: the four in the middle spell K A A M,
 * every other house has a door. Sized from the window (not the content column) so it
 * reaches both screen edges on desktop too.
 */
function HouseRow() {
  const { width: windowWidth } = useWindowDimensions();
  const [columnWidth, setColumnWidth] = useState(windowWidth);
  const wordWidth = WORD.length * (BIG + GAP);
  const sideCount = Math.ceil((windowWidth - wordWidth) / 2 / STEP) + 1;
  const items: { src: number; size: number }[] = [
    ...Array.from({ length: sideCount }, () => ({ src: DOOR, size: HOUSE })),
    ...WORD.map((ch) => ({ src: LETTER[ch], size: BIG })),
    ...Array.from({ length: sideCount }, () => ({ src: DOOR, size: HOUSE })),
  ];
  const rowWidth = items.reduce((w, it) => w + it.size + GAP, 0) - GAP;
  return (
    <View onLayout={(e) => setColumnWidth(e.nativeEvent.layout.width)} style={s.streetAnchor}>
      <View
        style={[
          s.street,
          { width: windowWidth, marginLeft: -(windowWidth - columnWidth) / 2 },
        ]}
        accessibilityRole="image"
        accessibilityLabel="Kaam">
        <View style={[s.streetInner, { width: rowWidth, marginLeft: (windowWidth - rowWidth) / 2 }]}>
          {items.map((it, i) => (
            <Image
              key={i}
              source={it.src}
              style={{ width: it.size, height: it.size }}
              resizeMode="contain"
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function Welcome() {
  const { t } = useI18n();
  const { devBypass } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <View style={s.wrap}>
        <View style={s.top}>
          <LanguageToggle />
        </View>
        <View style={s.hero}>
          <HouseRow />
          <Text style={s.tagline}>{t('app.tagline')}</Text>
        </View>
        <View style={s.actions}>
          {devBypass ? (
            <Button title={t('auth.devSignIn')} onPress={() => router.push('/(auth)/log-in')} />
          ) : (
            <>
              <Button title={t('welcome.signUp')} onPress={() => router.push('/(auth)/sign-up')} />
              <Button
                title={t('welcome.logIn')}
                variant="secondary"
                onPress={() => router.push('/(auth)/log-in')}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 520 },
  top: { alignItems: 'flex-end' },
  hero: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
  streetAnchor: { width: '100%' },
  street: { overflow: 'hidden' },
  streetInner: { flexDirection: 'row', alignItems: 'flex-end', gap: GAP },
  tagline: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: '#6B4A3A',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
