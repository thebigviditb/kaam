import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/en';
import type { PhoneBrowser } from '@/lib/install';
import { colors, radius, spacing, text } from '@/theme';

// What the phone's own buttons look like, so people can match the picture to the screen.
const IOS_BLUE = '#007AFF';
const IOS_GRAY = '#F2F2F7';
const ANDROID_BLUE = '#1A73E8';

type Step = { title: StringKey; hint?: StringKey; picture: React.ReactNode };

const s = StyleSheet.create({
  list: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accentText, fontSize: 18, fontWeight: '700' },
  body: { flex: 1, gap: spacing.xs, paddingTop: 5 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, lineHeight: 24 },
  picture: { flexDirection: 'row', marginTop: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    minWidth: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius,
    backgroundColor: IOS_GRAY,
  },
  menuLabel: { fontSize: 17, color: colors.text },
  addLabel: { fontSize: 17, fontWeight: '600', color: IOS_BLUE },
  installLabel: { fontSize: 17, fontWeight: '600', color: ANDROID_BLUE },
  appIcon: { width: 56, height: 56, borderRadius: 13 },
});

function Pill({ children }: { children: React.ReactNode }) {
  return <View style={s.pill}>{children}</View>;
}

const PICTURES = {
  more: (
    <Pill>
      <Ionicons name="ellipsis-horizontal" size={30} color={colors.text} />
    </Pill>
  ),
  share: (
    <Pill>
      <Ionicons name="share-outline" size={30} color={IOS_BLUE} />
    </Pill>
  ),
  safari: (
    <Pill>
      <Ionicons name="compass-outline" size={30} color={IOS_BLUE} />
    </Pill>
  ),
  addHome: (
    <Pill>
      <Text style={s.menuLabel}>Add to Home Screen</Text>
      <MaterialCommunityIcons name="plus-box-outline" size={26} color={colors.text} />
    </Pill>
  ),
  add: (
    <Pill>
      <Text style={s.addLabel}>Add</Text>
    </Pill>
  ),
  menu: (
    <Pill>
      <MaterialCommunityIcons name="dots-vertical" size={30} color={colors.text} />
    </Pill>
  ),
  addHomeAndroid: (
    <Pill>
      <MaterialCommunityIcons name="cellphone-arrow-down" size={26} color={colors.text} />
      <Text style={s.menuLabel}>Add to home screen</Text>
    </Pill>
  ),
  install: (
    <Pill>
      <Text style={s.installLabel}>Install</Text>
    </Pill>
  ),
  app: <Image source={require('../../assets/icon.png')} style={s.appIcon} accessibilityIgnoresInvertColors />,
};

function stepsFor(browser: PhoneBrowser): Step[] {
  if (browser === 'android') {
    // Android's Home Screen app shares the browser's login, so there is no "log in again".
    return [
      { title: 'install.android.tapMenu', hint: 'install.android.tapMenuHint', picture: PICTURES.menu },
      { title: 'install.android.tapAddHome', hint: 'install.android.tapAddHomeHint', picture: PICTURES.addHomeAndroid },
      { title: 'install.android.tapInstall', picture: PICTURES.install },
      { title: 'install.openApp', picture: PICTURES.app },
    ];
  }
  const first: Step[] =
    browser === 'safari26'
      ? [
          { title: 'install.tapMore', picture: PICTURES.more },
          { title: 'install.tapShare', picture: PICTURES.share },
        ]
      : browser === 'chrome'
        ? [{ title: 'install.tapShareTop', picture: PICTURES.share }]
        : browser === 'inApp'
          ? [
              { title: 'install.openSafari', hint: 'install.openSafariHint', picture: PICTURES.safari },
              { title: 'install.tapShare', hint: 'install.tapShareHint', picture: PICTURES.share },
            ]
          : [{ title: 'install.tapShareBottom', picture: PICTURES.share }];
  return [
    ...first,
    { title: 'install.tapAddHome', hint: 'install.tapAddHomeHint', picture: PICTURES.addHome },
    { title: 'install.tapAdd', picture: PICTURES.add },
    { title: 'install.openApp', hint: 'install.openAppHint', picture: PICTURES.app },
  ];
}

/** Numbered, picture-led steps for adding the site to the phone's Home Screen. */
export function InstallGuide({ browser }: { browser: PhoneBrowser }) {
  const { t } = useI18n();
  return (
    <View style={s.list} testID="install-guide">
      {stepsFor(browser).map((step, i) => (
        <View key={step.title} style={s.step}>
          <View style={s.number}>
            <Text style={s.numberText}>{i + 1}</Text>
          </View>
          <View style={s.body}>
            <Text style={s.title}>{t(step.title)}</Text>
            {step.hint ? <Text style={text.muted}>{t(step.hint)}</Text> : null}
            <View style={s.picture}>{step.picture}</View>
          </View>
        </View>
      ))}
    </View>
  );
}
