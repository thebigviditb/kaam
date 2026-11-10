import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { colors } from '@/theme';

/** A QR code for `value` as a PNG (2x for sharp screens). Renders an empty box of the same size until ready. */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 2, errorCorrectionLevel: 'M', color: { dark: colors.text } })
      .then((png) => live && setUri(png))
      .catch(() => live && setUri(null));
    return () => {
      live = false;
    };
  }, [value, size]);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size }} accessibilityLabel={label} />
  ) : (
    <View style={{ width: size, height: size }} />
  );
}
