import { Stack } from 'expo-router';
import React from 'react';

/** Public pages: readable without an account (privacy, terms). */
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
