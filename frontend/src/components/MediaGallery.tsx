import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Media } from '@/api/types';
import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls
    />
  );
}

export function MediaTile({
  item,
  size,
  onDelete,
}: {
  item: Media;
  size: number;
  onDelete?: () => void;
}) {
  const { label } = useI18n();
  return (
    <View style={[s.tile, { width: size, height: size }]}>
      {item.url ? (
        item.kind === 'video' ? (
          <Video uri={item.url} />
        ) : (
          <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )
      ) : (
        <View style={s.placeholder}>
          <Ionicons name={item.kind === 'video' ? 'videocam' : 'image'} size={28} color={colors.muted} />
          <Text style={text.small}>{label('mediaKinds', item.kind)}</Text>
        </View>
      )}
      {onDelete ? (
        <Pressable onPress={onDelete} style={s.delete} accessibilityRole="button" hitSlop={8}>
          <Ionicons name="close" size={16} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function MediaGallery({
  items,
  onDelete,
  emptyMessage,
}: {
  items: Media[];
  onDelete?: (item: Media) => void;
  emptyMessage?: string;
}) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, maxContentWidth) - spacing.md * 2;
  const columns = inner > 520 ? 4 : 3;
  const size = Math.floor((inner - spacing.sm * (columns - 1)) / columns);

  if (items.length === 0 && emptyMessage) {
    return <Text style={text.muted}>{emptyMessage}</Text>;
  }
  return (
    <View style={s.grid}>
      {items.map((m) => (
        <MediaTile key={m.id} item={m} size={size} onDelete={onDelete ? () => onDelete(m) : undefined} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { borderRadius: radius, overflow: 'hidden', backgroundColor: colors.bgAlt },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  delete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
