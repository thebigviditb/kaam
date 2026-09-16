import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './ui';
import { useMeta } from '@/api/hooks';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

const MAX_SUGGESTIONS = 8;

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function sameCity(a: string, b: string) {
  return clean(a).toLowerCase() === clean(b).toLowerCase();
}

export function sameCityName(a: string, b: string) {
  return sameCity(a, b);
}

/** Case-insensitive "starts with" matches first, then "contains"; at most MAX_SUGGESTIONS. */
export function suggestCities(all: string[], query: string, exclude: string[] = []): string[] {
  const q = clean(query).toLowerCase();
  if (!q) return [];
  const skip = new Set(exclude.map((c) => clean(c).toLowerCase()));
  const starts: string[] = [];
  const contains: string[] = [];
  for (const c of all) {
    const lc = c.toLowerCase();
    if (skip.has(lc)) continue;
    if (lc.startsWith(q)) starts.push(c);
    else if (lc.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

/**
 * Text input + suggestion list (from /meta.cities). Free text is valid: the typed value is
 * committed on Enter/Done, on blur, or when a suggestion is tapped.
 *
 * On web the input blurs before a tap on a suggestion lands, so blur commits the typed text
 * right away (a following "Next" tap sees it) but keeps the list mounted for a moment; a pick in
 * that window replaces the blur-committed text with the chosen city.
 */
const LIST_LINGER_MS = 300;

function useCityTyping({
  onCommit,
  onReplace,
  exclude,
  clearAfterCommit,
}: {
  onCommit: (city: string) => void;
  /** A suggestion tapped right after blur: swap the blur-committed text for the picked city. */
  onReplace: (previous: string, city: string) => void;
  exclude?: string[];
  /** Multi-value mode: the field empties once a city is accepted. */
  clearAfterCommit?: boolean;
}) {
  const meta = useMeta();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const blurCommitted = useRef<string | null>(null);
  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLinger = () => {
    if (lingerTimer.current) {
      clearTimeout(lingerTimer.current);
      lingerTimer.current = null;
    }
    blurCommitted.current = null;
  };
  useEffect(() => clearLinger, []);

  const commit = (value: string) => {
    clearLinger();
    const v = clean(value);
    setDraft(clearAfterCommit ? '' : v);
    if (v) onCommit(v);
  };

  const suggestions = focused ? suggestCities(meta.data?.cities ?? [], draft, exclude) : [];

  return {
    draft,
    setDraft,
    suggestions,
    commit,
    pick: (city: string) => {
      const previous = blurCommitted.current;
      clearLinger();
      setFocused(false);
      setDraft(clearAfterCommit ? '' : city);
      if (previous && !sameCity(previous, city)) onReplace(previous, city);
      else if (!previous) onCommit(city);
    },
    onFocus: () => {
      clearLinger();
      setFocused(true);
    },
    onBlur: () => {
      const v = clean(draft);
      commit(v);
      if (v) {
        blurCommitted.current = v;
        lingerTimer.current = setTimeout(() => {
          lingerTimer.current = null;
          blurCommitted.current = null;
          setFocused(false);
        }, LIST_LINGER_MS);
      } else {
        setFocused(false);
      }
    },
  };
}

function Suggestions({ items, onPick }: { items: string[]; onPick: (c: string) => void }) {
  if (items.length === 0) return null;
  return (
    <View style={s.list}>
      {items.map((c, i) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={c}
          onPress={() => onPick(c)}
          style={({ pressed }) => [s.item, i > 0 && s.itemBorder, pressed && { backgroundColor: colors.bgAlt }]}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={s.itemText}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** One city (home city / household city). `value` is the committed city; typing is local until committed. */
export function CityInput({
  value,
  onChange,
  placeholder,
  error,
  autoFocus,
}: {
  value: string | null;
  onChange: (city: string | null) => void;
  placeholder?: string;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const typing = useCityTyping({ onCommit: (c) => onChange(c || null), onReplace: (_prev, c) => onChange(c) });
  const { setDraft } = typing;

  // Keep the field in sync when the parent changes the value (initial load, reset).
  useEffect(() => {
    setDraft(value ?? '');
  }, [value, setDraft]);

  return (
    <View>
      <TextInput
        value={typing.draft}
        onChangeText={typing.setDraft}
        onFocus={typing.onFocus}
        onBlur={typing.onBlur}
        onSubmitEditing={() => typing.commit(typing.draft)}
        placeholder={placeholder ?? t('city.placeholder')}
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        autoFocus={autoFocus}
        accessibilityLabel={placeholder ?? t('city.placeholder')}
        style={[s.input, error && { borderColor: colors.danger }]}
      />
      <Suggestions items={typing.suggestions} onPick={typing.pick} />
    </View>
  );
}

/** Several cities (work cities): each accepted city becomes a removable chip above the input. */
export function CityMultiInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const { t } = useI18n();
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const addTo = (list: string[], city: string) => (list.some((c) => sameCity(c, city)) ? list : [...list, city]);
  const add = (city: string) => onChange(addTo(valueRef.current, city));
  const remove = (city: string) => onChange(valueRef.current.filter((c) => c !== city));

  const typing = useCityTyping({
    onCommit: add,
    onReplace: (prev, city) => onChange(addTo(valueRef.current.filter((c) => !sameCity(c, prev)), city)),
    exclude: value,
    clearAfterCommit: true,
  });
  const accept = typing.commit;

  return (
    <View>
      {value.length > 0 ? (
        <View style={s.chips}>
          {value.map((c) => (
            <View key={c} style={s.chip}>
              <Text style={s.chipText}>{c}</Text>
              <Pressable
                onPress={() => remove(c)}
                accessibilityRole="button"
                accessibilityLabel={`${t('common.remove')} ${c}`}
                hitSlop={8}
                style={s.chipX}>
                <Ionicons name="close" size={16} color={colors.accent} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={s.row}>
        <TextInput
          value={typing.draft}
          onChangeText={typing.setDraft}
          onFocus={typing.onFocus}
          onBlur={typing.onBlur}
          onSubmitEditing={() => accept(typing.draft)}
          submitBehavior="submit"
          placeholder={placeholder ?? t('city.addPlaceholder')}
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel={placeholder ?? t('city.addPlaceholder')}
          style={[s.input, { flex: 1 }, error && { borderColor: colors.danger }]}
        />
        {clean(typing.draft) ? (
          <Button title={t('city.add')} variant="secondary" onPress={() => accept(typing.draft)} />
        ) : null}
      </View>
      <Suggestions items={typing.suggestions} onPick={typing.pick} />
    </View>
  );
}

const s = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
    minHeight: 46,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  chipX: { padding: 2 },
});
