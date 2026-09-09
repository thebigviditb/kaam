import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { en, type StringKey, type Table } from './en';
import { hi } from './hi';

export type Language = 'en' | 'hi';
export const LANGUAGES: Language[] = ['en', 'hi'];

const STORAGE_KEY = 'kaam.language';
const tables: Record<Language, Table> = { en, hi };

type LabelGroup = Exclude<keyof Table, 'strings'>;

type I18n = {
  lang: Language;
  ready: boolean;
  setLang: (lang: Language) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  label: (group: LabelGroup, value: string | null | undefined) => string;
};

const I18nContext = createContext<I18n | null>(null);

function interpolate(s: string, params?: Record<string, string | number>) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'hi') setLangState(v);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18n>(() => {
    const table = tables[lang];
    return {
      lang,
      ready,
      setLang,
      t: (key, params) => interpolate(table.strings[key] ?? en.strings[key] ?? key, params),
      label: (group, v) => (v ? (table[group][v] ?? (en as Table)[group][v] ?? v) : ''),
    };
  }, [lang, ready, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export type { StringKey };
