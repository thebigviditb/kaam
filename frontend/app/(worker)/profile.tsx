import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { api, uploadToPresignedUrl } from '@/api/api';
import { errorMessage } from '@/api/client';
import {
  useDeleteMedia,
  useMeta,
  useMyMedia,
  useMyWorkerProfile,
  useRegisterMedia,
  useUpsertWorkerProfile,
} from '@/api/hooks';
import type { MediaKind, WorkerProfile } from '@/api/types';
import { MediaGallery } from '@/components/MediaGallery';
import { confirm, notify } from '@/components/notify';
import { Select } from '@/components/Select';
import { TagPicker } from '@/components/TagPicker';
import { Button, Field, InlineMessage, Input, Loading, Row, Screen, Section, Toggle } from '@/components/ui';
import { media as mediaLimits } from '@/config';
import { useI18n } from '@/i18n';
import { spacing, text } from '@/theme';

export default function WorkerProfileScreen() {
  const { t } = useI18n();
  const profile = useMyWorkerProfile();
  const meta = useMeta();

  if (profile.isPending || !meta.data) return <Loading />;

  return (
    <Screen title={profile.data ? t('profile.title') : t('profile.setupTitle')} subtitle={t('profile.workerIntro')}>
      <ProfileForm initial={profile.data} tags={meta.data.tags} cities={meta.data.cities} />
      <MediaSection />
    </Screen>
  );
}

function ProfileForm({
  initial,
  tags: allTags,
  cities,
}: {
  initial: WorkerProfile | null | undefined;
  tags: string[];
  cities: string[];
}) {
  const { t } = useI18n();
  const upsert = useUpsertWorkerProfile();
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [otherText, setOtherText] = useState(initial?.other_tag_text ?? '');
  const [years, setYears] = useState(initial ? String(initial.years_experience) : '0');
  const [rate, setRate] = useState(initial?.hourly_rate != null ? String(initial.hourly_rate) : '');
  const [city, setCity] = useState<string | null>(initial?.city ?? null);
  const [availability, setAvailability] = useState(initial?.availability ?? '');
  const [visible, setVisible] = useState(initial?.is_visible ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.name = t('profile.nameRequired');
    if (!city) e.city = t('profile.cityRequired');
    if (tags.includes('other') && !otherText.trim()) e.other = t('profile.otherRequired');
    setErrors(e);
    if (Object.keys(e).length) return;
    setServerError(null);
    const yrs = Math.max(0, Math.min(60, Math.round(Number(years) || 0)));
    const rt = rate.trim() ? Number(rate) : null;
    try {
      await upsert.mutateAsync({
        display_name: displayName.trim(),
        bio: bio.trim(),
        tags,
        other_tag_text: tags.includes('other') ? otherText.trim() : null,
        years_experience: yrs,
        hourly_rate: rt != null && Number.isFinite(rt) && rt >= 0 ? rt : null,
        city: city as string,
        availability: availability.trim(),
        is_visible: visible,
      });
      setSaved(true);
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <>
      {serverError ? <InlineMessage message={serverError} /> : null}
      {saved ? <InlineMessage message={t('profile.saved')} tone="success" /> : null}
      <Field label={t('profile.displayName')} error={errors.name}>
        <Input value={displayName} onChangeText={setDisplayName} error={Boolean(errors.name)} />
      </Field>
      <Field label={t('profile.bio')} optional>
        <Input value={bio} onChangeText={setBio} multiline placeholder={t('profile.bioPlaceholder')} />
      </Field>
      <TagPicker
        tags={allTags}
        value={tags}
        onChange={setTags}
        otherText={otherText}
        onOtherTextChange={setOtherText}
        otherError={errors.other}
      />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Field label={t('profile.yearsExperience')}>
            <Input value={years} onChangeText={setYears} keyboardType="number-pad" />
          </Field>
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Field label={t('profile.hourlyRate')} optional>
            <Input value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="25" />
          </Field>
        </View>
      </Row>
      <Field label={t('common.city')} error={errors.city}>
        <Select value={city} options={cities} onChange={setCity} placeholder={t('common.city')} error={Boolean(errors.city)} />
      </Field>
      <Field label={t('profile.availability')} optional>
        <Input value={availability} onChangeText={setAvailability} placeholder={t('profile.availabilityPlaceholder')} />
      </Field>
      <Toggle label={t('profile.visible')} value={visible} onChange={setVisible} />
      <Button title={t('common.save')} onPress={submit} loading={upsert.isPending} style={{ marginTop: spacing.md }} />
    </>
  );
}

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

function MediaSection() {
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
    <Section title={t('profile.media')}>
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
        <MediaGallery items={media.data} onDelete={(m) => onDelete(m.id)} emptyMessage={t('workers.noMedia')} />
      )}
    </Section>
  );
}
