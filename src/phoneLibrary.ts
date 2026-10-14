import * as MediaLibrary from "expo-media-library/legacy";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { type Photo } from "./photos";
import { type Edit } from "./session";
import { monthBounds, editableFileUri } from "./collectionRules";
import { localPhotoBytes } from "./photoSizes";

export type CollectionSelection = {
  mode: "demo" | "phone";
  albumId?: string;
  title?: string;
  month?: string;
};

// The paged legacy API is documented and bundled in Expo Go SDK 57.
export async function readPhotoPage(
  selection: CollectionSelection,
  after?: string,
) {
  const permission = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
  if (!permission.granted)
    throw new Error(
      "Photo access is off. Connect Photos again or open your phone settings.",
    );
  const page = await MediaLibrary.getAssetsAsync({
    first: 40,
    after,
    album: selection.albumId,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    resolveWithFullInfo: true,
    ...(selection.month ? monthBounds(selection.month) : {}),
  });
  return {
    ...page,
    photos: page.assets.map((asset): Photo => ({
      id: `phone:${asset.id}`,
      assetId: asset.id,
      source: { uri: asset.uri },
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
      bytes: 0,
      creationTime: asset.creationTime,
      isScreenshot: asset.mediaSubtypes?.includes("screenshot"),
    })),
  };
}

export async function readPhotoSize(photo: Photo): Promise<number> {
  if (!photo.assetId) return photo.bytes;
  const asset = await MediaLibrary.getAssetInfoAsync(photo.assetId, {
    shouldDownloadFromNetwork: false,
  });
  return localPhotoBytes(asset, (uri) => new File(uri).size);
}

export async function resolvePhoto(photo: Photo): Promise<Photo> {
  if (!photo.assetId) return photo;
  const asset = await MediaLibrary.getAssetInfoAsync(photo.assetId, {
    shouldDownloadFromNetwork: true,
  });
  const localUri = editableFileUri(asset.localUri);
  const bytes = localPhotoBytes(asset, (uri) => new File(uri).size) || photo.bytes;
  // Normalize HEIC and orientation before Skia decodes the editor image.
  const scale = Math.min(1, 2048 / Math.max(asset.width, asset.height));
  const context = ImageManipulator.manipulate(localUri);
  context.resize({
    width: Math.max(1, Math.round(asset.width * scale)),
    height: Math.max(1, Math.round(asset.height * scale)),
  });
  const rendered = await context.renderAsync();
  const normalized = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 1,
  });
  return {
    ...photo,
    source: { uri: normalized.uri },
    width: asset.width,
    height: asset.height,
    bytes,
  };
}

export async function saveCopyToPhotos(edit: Edit): Promise<Edit> {
  const permission = await MediaLibrary.requestPermissionsAsync(true, [
    "photo",
  ]);
  if (!permission.granted)
    throw new Error(
      "Allow saving to Photos to save this copy. Your original is unchanged.",
    );
  const asset = await MediaLibrary.createAssetAsync(edit.uri);
  return { ...edit, libraryAssetId: asset.id };
}

export async function removePhonePhotos(photos: Photo[]) {
  if (!photos.length || photos.some((photo) => !photo.assetId))
    throw new Error("Only reviewed phone photos can be removed.");
  return MediaLibrary.deleteAssetsAsync(photos.map((photo) => photo.assetId!));
}
