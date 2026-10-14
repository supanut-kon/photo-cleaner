import { useTheme, useThemedStyles, type Palette } from "./ui";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library/legacy";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { photos as demoPhotos, type Photo } from "./photos";
import { readPhotoPage, readPhotoSize, type CollectionSelection } from "./phoneLibrary";
import { loadPhotoSizeBatch } from "./photoSizes";
import { Button, Backdrop, Glass, IconButton, Pill, themedStyles } from "./ui";

const SELECTION_KEY = "keep.collection.v1";
export function useCollection() {
  const [selection, setSelection] = useState<CollectionSelection>({
    mode: "demo",
  });
  const [photos, setPhotos] = useState<Photo[]>(demoPhotos);
  const [picker, setPicker] = useState(Platform.OS !== "web");
  const [connected, setConnected] = useState(false);
  const [limited, setLimited] = useState(false);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(9);
  const [generation, setGeneration] = useState(0);
  const lock = useRef(false);
  const live = useRef(true);
  const sizeGeneration = useRef(0);

  const hydrateSizes = useCallback((pagePhotos: Photo[], token: number) => {
    void loadPhotoSizeBatch(pagePhotos, readPhotoSize, (sizes) => {
      setPhotos((old) => old.map((photo) => {
        const bytes = sizes.get(photo.id);
        return bytes !== undefined && bytes !== photo.bytes ? { ...photo, bytes } : photo;
      }));
    }, () => live.current && sizeGeneration.current === token);
  }, []);

  const choose = useCallback(async (next: CollectionSelection) => {
    if (lock.current) return;
    lock.current = true;
    const sizeToken = ++sizeGeneration.current;
    setBusy(true);
    setError("");
    try {
      const page = next.mode === "phone" ? await readPhotoPage(next) : null;
      if (!live.current) return;
      setPhotos(page?.photos ?? demoPhotos);
      if (page) hydrateSizes(page.photos, sizeToken);
      setCursor(page?.endCursor);
      setHasNext(page?.hasNextPage ?? false);
      setTotal(page?.totalCount ?? 9);
      setSelection(next);
      setGeneration((value) => value + 1);
      setPicker(false);
      await AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(next));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not open this collection. Try again.",
      );
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  }, [hydrateSizes]);
  async function connect() {
    if (lock.current || Platform.OS === "web") return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, [
        "photo",
      ]);
      if (!permission.granted)
        throw new Error(
          "Photo access was not granted. You can use the demo, or enable Photos access in Settings.",
        );
      setLimited(permission.accessPrivileges === "limited");
      setConnected(true);
      setAlbums(
        await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to connect Photos.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function loadMore() {
    if (lock.current || !hasNext) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const page = await readPhotoPage(selection, cursor);
      setPhotos((old) => [
        ...new Map(
          [...old, ...page.photos].map((photo) => [photo.id, photo]),
        ).values(),
      ]);
      setCursor(page.endCursor);
      setHasNext(page.hasNextPage);
      setTotal(page.totalCount);
      hydrateSizes(page.photos, sizeGeneration.current);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the next batch.",
      );
      setPicker(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function updatePhoto(photo: Photo) {
    setPhotos((old) =>
      old.map((item) => (item.id === photo.id ? photo : item)),
    );
  }
  useEffect(() => {
    live.current = true;
    if (Platform.OS !== "web")
      void AsyncStorage.getItem(SELECTION_KEY).then(async (raw) => {
        if (!live.current || !raw) return;
        try {
          const saved = JSON.parse(raw) as CollectionSelection;
          if (saved.mode === "demo") setPicker(false);
          else if (saved.mode === "phone") {
            const permission = await MediaLibrary.getPermissionsAsync(false, [
              "photo",
            ]);
            if (permission.granted) {
              setLimited(permission.accessPrivileges === "limited");
              await choose(saved);
            }
          }
        } catch {
          /* Fall back to the chooser. */
        }
      });
    return () => {
      live.current = false;
    };
    // Restore the selection once; permission requests remain user initiated.
  }, [choose]);
  useEffect(() => {
    if (Platform.OS === "web" || selection.mode !== "phone") return;
    let active = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || lock.current) return;
      void MediaLibrary.getPermissionsAsync(false, ["photo"])
        .then(async (permission) => {
          if (!active) return;
          setLimited(permission.accessPrivileges === "limited");
          if (!permission.granted) {
            setPhotos([]);
            sizeGeneration.current += 1;
            setPicker(true);
            setError("Photo access changed. Reconnect Photos to continue.");
          } else {
            const page = await readPhotoPage(selection);
            if (!active || lock.current) return;
            setPhotos(page.photos);
            hydrateSizes(page.photos, ++sizeGeneration.current);
            setCursor(page.endCursor);
            setHasNext(page.hasNextPage);
            setTotal(page.totalCount);
          }
        })
        .catch(() => {});
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [selection, hydrateSizes]);
  return {
    selection,
    photos,
    picker,
    setPicker,
    connected,
    limited,
    albums,
    busy,
    error,
    setError,
    choose,
    connect,
    loadMore,
    hasNext,
    total,
    generation,
    updatePhoto,
  };
}
export type Collection = ReturnType<typeof useCollection>;

export function CollectionPicker({ library }: { library: Collection }) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  const [month, setMonth] = useState("");
  return (
    <Modal
      visible={library.picker}
      animationType="slide"
      onRequestClose={() => !library.busy && library.setPicker(false)}
    >
      <SafeAreaProvider>
        <SafeAreaView style={s.screen}>
          <Backdrop />
          <View style={s.header}>
        <Glass intensity={25} />
            <Text style={s.title}>Hello, keeper.</Text>
            <IconButton
              icon="close"
              label="Close photo chooser"
              onPress={() => !library.busy && library.setPicker(false)}
            />
          </View>
          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
          >
            <Pill text="YOUR PHOTOS. YOUR CALL." />
            <Text style={s.heading}>
              A little space.{"\n"}A lot of keepers.
            </Text>
            <Text style={s.copy}>
              Swipe right to keep, left to queue. Undo a swipe anytime before
              removal. Review the queue before your phone asks you to confirm
              deletion.
            </Text>
            <View style={s.note}>
        <Glass intensity={25} />
              <Text style={[s.copy, { color: colors.ink }]}>
                Edits create a new JPEG in Photos. Originals stay unchanged.
                Photos are never uploaded to a server.
              </Text>
            </View>
            {Platform.OS === "web" ? (
              <Text style={s.copy}>
                Connect your real photo library in Expo Go on your iPhone or
                Android. This browser preview uses demo photos.
              </Text>
            ) : (
              <Button
                label={library.busy ? "Opening Photos…" : "Connect Photos"}
                icon="images-outline"
                onPress={library.connect}
                disabled={library.busy}
              />
            )}
            {library.connected && (
              <>
                <Text style={s.copy}>
                  {library.limited
                    ? "Only the photos you allowed are visible. You can change the selection below."
                    : "Choose recent photos, an album, or a month."}
                </Text>
                {library.limited && (
                  <Button
                    label="Change allowed photos"
                    secondary
                    onPress={async () => {
                      try {
                        await MediaLibrary.presentPermissionsPickerAsync([
                          "photo",
                        ]);
                        await library.connect();
                      } catch {
                        library.setError(
                          "Open Settings to change Photos access.",
                        );
                      }
                    }}
                    disabled={library.busy}
                  />
                )}
                <Button
                  label="Recent photos"
                  secondary
                  onPress={() =>
                    library.choose({ mode: "phone", title: "Recent photos" })
                  }
                  disabled={library.busy}
                />
                <TextInput
                  accessibilityLabel="Month in YYYY-MM format"
                  placeholder="Month, e.g. 2026-10"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.accent}
                  value={month}
                  onChangeText={setMonth}
                  style={s.input}
                  autoCorrect={false}
                  maxLength={7}
                />
                <Button
                  label="Review this month"
                  secondary
                  disabled={library.busy || !month}
                  onPress={() =>
                    library.choose({ mode: "phone", title: month, month })
                  }
                />
                <Text style={s.label}>YOUR ALBUMS</Text>
                {library.albums.map((album) => (
                  <Button
                    key={album.id}
                    label={album.title}
                    secondary
                    disabled={library.busy}
                    onPress={() =>
                      library.choose({
                        mode: "phone",
                        albumId: album.id,
                        title: album.title,
                      })
                    }
                  />
                ))}
              </>
            )}
            {!!library.error && (
              <>
                <Text accessibilityRole="alert" style={s.error}>
                  {library.error}
                </Text>
                {Platform.OS !== "web" && (
                  <Button
                    label="Open phone settings"
                    secondary
                    onPress={() => void Linking.openSettings()}
                  />
                )}
              </>
            )}
            <Button
              label="Try the demo photos"
              secondary
              disabled={library.busy}
              onPress={() => library.choose({ mode: "demo" })}
            />
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
const createStyles = (colors: Palette) => themedStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  header: {
    overflow: "hidden",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.yellow,
  },
  title: { fontSize: 19, fontWeight: "700", color: colors.ink },
  body: { padding: 22, gap: 18, paddingBottom: 40 },
  heading: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "700",
    color: colors.ambientInk,
  },
  copy: { fontSize: 12, lineHeight: 22, color: colors.ambientInk },
  note: {
    overflow: "hidden",
    padding: 15,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  input: {
    backgroundColor: colors.paper,
    minHeight: 52,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    fontSize: 13,
    color: colors.ink,
  },
  label: { fontSize: 11, fontWeight: "700", color: colors.ambientInk },
  error: { fontSize: 12, lineHeight: 20, color: colors.coral },
});
