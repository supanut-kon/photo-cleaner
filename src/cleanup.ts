export type CleanupFilter = "all" | "screenshots" | "large";
export const LARGE_PHOTO_BYTES = 1_000_000;
type CleanupPhoto = { id: string; filename: string; bytes: number; isScreenshot?: boolean; source?: number | { uri: string } };

export function matchesCleanup(photo: CleanupPhoto, filter: CleanupFilter) {
  if (filter === "all") return true;
  if (filter === "large") return Number.isFinite(photo.bytes) && photo.bytes >= LARGE_PHOTO_BYTES;
  if (photo.isScreenshot !== undefined) return photo.isScreenshot;
  const path = typeof photo.source === "object" ? photo.source.uri : "";
  return /(?:^|[\\/ _-])screenshots?(?:[\\/ _.-]|$)|screen[ _-]shot/i.test(`${photo.filename} ${path}`);
}

export function cleanupProgress<T extends CleanupPhoto>(photos: T[], filter: CleanupFilter,
  decisions: Record<string, string>, removed: string[]) {
  const removedIds = new Set(removed);
  const matching = photos.filter((photo) => !removedIds.has(photo.id) && matchesCleanup(photo, filter));
  const pending = matching.filter((photo) => !decisions[photo.id]);
  return { matching, pending, reviewed: matching.length - pending.length };
}
