import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { api, uploadToPresignedUrl } from '@/api/api';
import { errorMessage } from '@/api/client';
import { useDeleteMedia, useMyMedia, useRegisterMedia } from '@/api/hooks';
import type { MediaKind } from '@/api/types';
import { MediaGallery } from '@/components/MediaGallery';
import { confirm, notify } from '@/components/notify';
import { Button, InlineMessage, Loading, Row } from '@/components/ui';
import { media as mediaLimits } from '@/config';
import { useI18n } from '@/i18n';
import { spacing, text } from '@/theme';

function guessContentType(asset: ImagePicker.ImagePickerAsset, kind: MediaKind): string {
  if (asset.mimeType) return asset.mimeType;
  const name = (asset.fileName ?? asset.uri).toLowerCase();
  const ext = name.split('?')[0].split('.').pop() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  };
  return map[ext] ?? (kind === 'image' ? 'image/jpeg' : 'video/mp4');
}

/** Upload / list / delete the signed-in user's photos and videos. */
export function MediaSection() {
  const { t } = useI18n();
  const media = useMyMedia();
  const register = useRegisterMedia();
  const remove = useDeleteMedia();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = media.data?.length ?? 0;
  const atLimit = count >= mediaLimits.maxItems;

  const pick = async (kind: MediaKind) => {
    setError(null);
    if (atLimit) return setError(t('profile.mediaLimit'));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? ['images'] : ['videos'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const contentType = guessContentType(asset, kind);
    if (!mediaLimits.allowedContentTypes[kind].includes(contentType)) {
      return setError(`${t('profile.unsupportedType')} (${contentType})`);
    }
    setUploading(true);
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const size = asset.fileSize ?? blob.size;
      const limit = kind === 'image' ? mediaLimits.maxImageBytes : mediaLimits.maxVideoBytes;
      if (size > limit) throw new Error(t('profile.tooLarge'));
      const presign = await api.presignMedia({ kind, content_type: contentType, size_bytes: size });
      await uploadToPresignedUrl(presign, blob);
      await register.mutateAsync({ kind, s3_key: presign.s3_key, content_type: contentType });
    } catch (e) {
      setError(`${t('profile.uploadFailed')}: ${errorMessage(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!(await confirm(t('profile.deleteMedia'), { ok: t('common.delete'), cancel: t('common.cancel') }))) return;
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  return (
    <View>
      <Text style={[text.small, { marginBottom: spacing.sm }]}>
        {t('profile.mediaHint', { n: mediaLimits.maxItems })} ({count}/{mediaLimits.maxItems})
      </Text>
      {error ? <InlineMessage message={error} /> : null}
      <Row style={{ marginBottom: spacing.md }}>
        <Button title={t('profile.addPhoto')} variant="secondary" small onPress={() => pick('image')} disabled={uploading || atLimit} />
        <Button title={t('profile.addVideo')} variant="secondary" small onPress={() => pick('video')} disabled={uploading || atLimit} />
        {uploading ? <Text style={text.muted}>{t('profile.uploading')}</Text> : null}
      </Row>
      {media.isPending ? (
        <Loading />
      ) : media.isError ? (
        <InlineMessage message={media.error.message} />
      ) : (
        <MediaGallery items={media.data} onDelete={(m) => onDelete(m.id)} emptyMessage={t('detail.noMedia')} />
      )}
    </View>
  );
}
