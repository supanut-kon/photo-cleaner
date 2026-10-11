type SizeTarget = { id: string; assetId?: string; bytes: number };

export function localPhotoBytes(
  asset: { localUri?: string; uri?: string },
  readSize: (uri: string) => number,
) {
  const uri = asset.localUri ?? asset.uri;
  if (!uri || !/^(file|content):\/\//.test(uri)) return 0;
  try {
    const bytes = readSize(uri);
    return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  } catch {
    return 0;
  }
}

// Keep metadata work bounded and independent of displaying or editing images.
export async function loadPhotoSizes<T extends SizeTarget>(
  photos: T[],
  readSize: (photo: T) => Promise<number>,
  onSize: (id: string, bytes: number) => void,
  isActive: () => boolean,
) {
  const pending = photos.filter((photo) => photo.assetId && photo.bytes <= 0);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, async () => {
    while (isActive() && index < pending.length) {
      const photo = pending[index++];
      try {
        const bytes = await readSize(photo);
        if (isActive() && Number.isFinite(bytes) && bytes > 0) onSize(photo.id, bytes);
      } catch {
        // An inaccessible or cloud-only photo must not stop the rest of the page.
      }
    }
  }));
}

export function summarizePhotoSizes(photos: { bytes: number }[]) {
  return photos.reduce<{ bytes: number; unknown: number }>((total, photo) => {
    if (Number.isFinite(photo.bytes) && photo.bytes > 0) total.bytes += photo.bytes;
    else total.unknown += 1;
    return total;
  }, { bytes: 0, unknown: 0 });
}
