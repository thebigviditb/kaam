import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

export type TabDef = {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Unread count shown on the tab icon; hidden when 0. */
  badge?: number;
};

/** `hidden` routes live inside the tab navigator (detail screens) but get no tab button. */
export function AppTabs({ tabs, hidden = [] }: { tabs: TabDef[]; hidden?: string[] }) {
  // Keep the bar above the iOS home indicator (home-screen app / viewport-fit=cover).
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
          paddingBottom: bottom,
          height: 56 + bottom,
        },
        tabBarLabelStyle: { fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={color} />,
            tabBarBadge: tab.badge ? (tab.badge > 99 ? '99+' : tab.badge) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.accentText, fontSize: 11 },
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
