import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { photos as demoPhotos, formatBytes, type Photo } from "./photos";
import {
  clearQueue,
  decide,
  emptySession,
  restoreSession,
  undo,
  type Decision,
  type Session,
} from "./session";
import {
  Button,
  colors,
  hardShadow,
  themedStyles,
  Icon,
  IconButton,
  Pill,
  type IconName,
} from "./ui";
import Editor from "./Editor";
import { downloadCopy } from "./download";
import {
  CollectionPicker,
  useCollection,
  type Collection,
} from "./Collections";
import { resolvePhoto, removePhonePhotos } from "./phoneLibrary";
import { summarizePhotoSizes } from "./photoSizes";

const sessionWrites = { current: Promise.resolve() };
const STORAGE_KEY = "keep.prototype.session.v1";
const photoSource = (photo: Photo, session: Session) =>
  session.edits[photo.id] ? { uri: session.edits[photo.id].uri } : photo.source;

type SwipePhotoCardProps = {
  photos: Photo[];
  albumName: string;
  photo: Photo;
  active: boolean;
  session: Session;
  onMotion: (moving: boolean) => void;
  onDecide: (decision: Decision) => void;
  onEdit: () => void;
};

type SwipeCardHandle = { fly: (decision: Decision) => void };

const SwipePhotoCard = forwardRef<SwipeCardHandle, SwipePhotoCardProps>(function SwipePhotoCard({
  photos,
  albumName,
  photo,
  active,
  onMotion,
  session,
  onDecide,
  onEdit,
}, ref) {
  const x = useSharedValue(0),
    y = useSharedValue(0),
    locked = useSharedValue(false);
  const complete = (decision: Decision) => {
    onMotion(false);
    onDecide(decision);
  };
  const fly = (decision: Decision) => {
    if (!active || locked.get()) return;
    locked.set(true);
    onMotion(true);
    x.set(withTiming(
      decision === "keep" ? 650 : -650,
      { duration: 230 },
      (finished) => {
        if (finished) runOnJS(complete)(decision);
      },
    ));
  };
  useImperativeHandle(ref, () => ({ fly }));
  const pan = Gesture.Pan()
    .enabled(active)
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      if (!locked.get()) {
        x.set(event.translationX);
        y.set(event.translationY * 0.18);
      }
    })
    .onEnd((event) => {
      if (locked.get()) return;
      if (
        Math.abs(event.translationX) > 95 ||
        Math.abs(event.velocityX) > 800
      ) {
        locked.set(true);
        runOnJS(onMotion)(true);
        const direction =
          Math.abs(event.translationX) > 95
            ? event.translationX
            : event.velocityX;
        x.set(withTiming(
          direction > 0 ? 650 : -650,
          { duration: 230 },
          (finished) => {
            if (finished) runOnJS(complete)(direction > 0 ? "keep" : "trash");
          },
        ));
      } else {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    })
    .onFinalize(() => {
      if (!locked.get()) {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    });
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { rotate: `${x.get() / 22}deg` },
    ],
  }));
  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [15, 110], [0, 1], "clamp"),
  }));
  const trashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-110, -15], [1, 0], "clamp"),
  }));
  return (
    <GestureDetector gesture={pan}>
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      aria-hidden={!active}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[s.photoCard, StyleSheet.absoluteFill, { zIndex: active ? 2 : 1 }, cardStyle]}
    >
      <Image
        source={photoSource(photo, session)}
        cachePolicy="memory-disk"
        transition={0}
        style={s.cover}
        contentFit="cover"
        blurRadius={18}
      />
      <Image
        source={photoSource(photo, session)}
        cachePolicy="memory-disk"
        transition={0}
        style={[StyleSheet.absoluteFill, s.cover]}
        contentFit="contain"
      />
      <LinearGradient
        colors={["transparent", "#14231AC0"]}
        style={s.cardGradient}
      />
      <View style={s.cardTop}>
        <View style={s.photoTag}>
          <Icon name="images-outline" size={13} color="white" />
          <Text numberOfLines={1} style={s.photoTagText}>
            {albumName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit current photo"
          onPress={onEdit}
          style={s.editChip}
        >
          <Icon name="options-outline" color="white" size={16} />
          <Text style={s.editChipText}>Edit</Text>
        </Pressable>
      </View>
      <Animated.View style={[s.stamp, s.keepStamp, keepStyle]}>
        <Text style={[s.stampText, { color: "#E3FFC0" }]}>KEEP</Text>
      </Animated.View>
      <Animated.View style={[s.stamp, s.trashStamp, trashStyle]}>
        <Text style={[s.stampText, { color: "#FFE1D3" }]}>REMOVE</Text>
      </Animated.View>
      <View style={s.cardBottom}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.photoLabel}>
            Photo {String(photos.indexOf(photo) + 1).padStart(2, "0")}
          </Text>
          <Text style={s.photoMeta}>
            {session.edits[photo.id]
              ? `${session.edits[photo.id].width} × ${session.edits[photo.id].height} · Edited copy`
              : `${photo.width} × ${photo.height} · ${formatBytes(photo.bytes)}`}
          </Text>
        </View>

      </View>
    </Animated.View>
  </GestureDetector>
  );
});

function SwipeCard({
  photos,
  albumName,
  photo,
  next,
  session,
  height,
  onDecide,
  onEdit,
  onUndo,
  canUndo,
}: {
  photos: Photo[];
  albumName: string;
  photo: Photo;
  next?: Photo;
  session: Session;
  height: number;
  onDecide: (decision: Decision) => void;
  onEdit: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const activeCard = useRef<SwipeCardHandle>(null);
  const [moving, setMoving] = useState(false);
  return (
    <View>
      <View style={[s.cardArea, { height }]}>
        {/* Stable photo keys preserve the already loaded image when it becomes active. */}
        {[next, photo].filter((item): item is Photo => Boolean(item)).map((item) => (
          <SwipePhotoCard
            key={item.id}
            ref={item.id === photo.id ? activeCard : undefined}
            photos={photos}
            albumName={albumName}
            photo={item}
            active={item.id === photo.id}
            session={session}
            onMotion={setMoving}
            onDecide={onDecide}
            onEdit={onEdit}
          />
        ))}
      <View pointerEvents="box-none" style={s.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark photo for removal"
          onPress={() => activeCard.current?.fly("trash")}
          style={({ pressed }) => [
            s.actionCircle,
            s.trashCircle,
            pressed && {
              transform: [{ translateX: 2 }, { translateY: 2 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="close-outline" size={34} color={colors.coral} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last decision"
          accessibilityState={{ disabled: !canUndo || moving }}
          disabled={!canUndo || moving}
          onPress={onUndo}
          style={({ pressed }) => [
            s.undoCircle,
            (!canUndo || moving) && { opacity: 0.35 },
            pressed && {
              transform: [{ translateX: 2 }, { translateY: 2 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="arrow-undo-outline" color={colors.muted} size={21} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep photo"
          onPress={() => activeCard.current?.fly("keep")}
          style={({ pressed }) => [
            s.actionCircle,
            s.keepCircle,
            pressed && {
              transform: [{ translateX: 2 }, { translateY: 2 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="heart-outline" size={29} color={colors.accent} />
        </Pressable>
      </View>
      </View>
    </View>
  );
}

export default function AppContent() {
  const library = useCollection();
  return (
    <>
      <PhotoWorkspace
        key={`${library.selection.mode}:${library.generation}`}
        library={library}
      />
      <CollectionPicker library={library} />
    </>
  );
}
function PhotoWorkspace({ library }: { library: Collection }) {
  const photos = library.photos;
  const phoneMode = library.selection.mode === "phone";
  const storageKey = phoneMode ? "keep.phone.session.v1" : STORAGE_KEY;
  const albumName = phoneMode
    ? (library.selection.title ?? "Your Photos")
    : "AppProjects";
  const [removing, setRemoving] = useState(false);
  const [gridPage, setGridPage] = useState(0);
  const editorLock = useRef(false);
  const [session, setSession] = useState<Session>(emptySession),
    [ready, setReady] = useState(false);
  const savedPhotos: Photo[] = Object.entries(session.edits)
    .filter(([id]) => !photos.some((photo) => photo.id === id))
    .map(([id, edit]) => ({
      id,
      source: { uri: edit.uri },
      filename: edit.filename ?? "Edited photo.jpg",
      width: edit.width,
      height: edit.height,
      bytes: 0,
    }));
  const allPhotos = [...photos, ...savedPhotos];
  const params = useLocalSearchParams<{
    tab?: string;
    panel?: string;
    edit?: string;
    preview?: string;
  }>();
  const tab: "clean" | "library" | "edits" =
    params.tab === "library" || params.tab === "edits" ? params.tab : "clean";
  const setTab = useCallback(
    (value: "clean" | "library" | "edits") => router.setParams({ tab: value }),
    [],
  );
  const sheet =
    params.panel === "queue" || params.panel === "settings"
      ? params.panel
      : null;
  const setSheet = useCallback(
    (value: "queue" | "settings" | null) =>
      router.setParams({ panel: value ?? "" }),
    [],
  );
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState(""),
    [libraryFilter, setLibraryFilter] = useState<"all" | "kept" | "pending">(
      "all",
    );
  const editorPhoto = allPhotos.find((p) => p.id === params.edit) ?? null;
  const previewPhoto = allPhotos.find((p) => p.id === params.preview) ?? null;
  const setEditorPhoto = useCallback(
    async (photo: Photo | null) => {
      if (!photo) {
        router.setParams({ edit: "" });
        return;
      }
      if (editorLock.current) return;
      editorLock.current = true;
      try {
        if (photo.assetId && !session.edits[photo.id]) {
          setMessage("Preparing photo for editing...");
          library.updatePhoto(await resolvePhoto(photo));
        }
        router.setParams({ edit: photo.id });
        setMessage("");
      } catch (cause) {
        setMessage(
          cause instanceof Error ? cause.message : "Unable to open this photo.",
        );
      } finally {
        editorLock.current = false;
      }
    },
    [library, session.edits, setMessage],
  );
  const setPreviewPhoto = useCallback(
    (photo: Photo | null) => router.setParams({ preview: photo?.id ?? "" }),
    [],
  );
  const [exporting, setExporting] = useState(false);
  const writes = sessionWrites;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [reviewViewportHeight, setReviewViewportHeight] = useState(0);
  // Reserve space for progress and a glimpse of the next button.
  // Measuring the scroll viewport accounts for the header, tabs and phone safe areas.
  const cardHeight = Math.max(160, (reviewViewportHeight || windowHeight - 190) - 98);
  useEffect(() => {
    let active = true;
    writes.current
      .then(() => AsyncStorage.getItem(storageKey))
      .then((raw) => {
        const restored = restoreSession(
          raw,
          phoneMode ? undefined : demoPhotos.map((p) => p.id),
        );
        if (Platform.OS !== "web")
          for (const id of Object.keys(restored.edits)) {
            try {
              if (!new File(restored.edits[id].uri).exists)
                delete restored.edits[id];
            } catch {
              delete restored.edits[id];
            }
          }
        if (active) setSession(restored);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Saved progress could not be loaded. Starting a fresh session.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
    // A workspace is remounted when its collection changes. Paging preserves this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(session)))
      .catch(() => {
        setMessage(
          "Progress could not be saved on this device. You can still review photos.",
        );
      });
  }, [session, ready, storageKey, writes]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (removing) return true;
        if (editorPhoto) {
          setEditorPhoto(null);
          return true;
        }
        if (previewPhoto) {
          setPreviewPhoto(null);
          return true;
        }
        if (sheet) {
          setSheet(null);
          setConfirm(false);
          return true;
        }
        if (tab !== "clean") {
          setTab("clean");
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [
    editorPhoto,
    previewPhoto,
    sheet,
    tab,
    setEditorPhoto,
    setPreviewPhoto,
    setSheet,
    setTab,
    removing,
  ]);

  const pending = photos.filter(
    (p) => !session.decisions[p.id] && !session.removed.includes(p.id),
  );
  const kept = photos.filter((p) => session.decisions[p.id] === "keep");
  const queued = photos.filter((p) => session.decisions[p.id] === "trash");
  const edited = allPhotos.filter((p) => !!session.edits[p.id]);
  const queueSizes = summarizePhotoSizes(queued);
  const queueSizeLabel = queueSizes.unknown && queueSizes.bytes > 0
    ? `${formatBytes(queueSizes.bytes)} known · ${queueSizes.unknown} sizes unavailable`
    : formatBytes(queueSizes.bytes);
  const reviewed = photos.length - pending.length;
  const visible =
    tab === "edits"
      ? edited
      : photos.filter(
          (p) =>
            !session.removed.includes(p.id) &&
            (libraryFilter === "all" ||
              (libraryFilter === "kept"
                ? session.decisions[p.id] === "keep"
                : !session.decisions[p.id])),
        );
  const current = pending[0];
  function openQueue() {
    setSheet("queue");
    setConfirm(false);
  }
  function review(decision: Decision) {
    if (!current) return;
    setSession((value) => decide(value, current.id, decision));
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
  }
  function restart() {
    setSession((value) => ({
      ...emptySession(),
      removed: phoneMode ? value.removed : [],
      edits: value.edits,
    }));
    setSheet(null);
    setTab("clean");
    setMessage(
      phoneMode
        ? "Swipe decisions reset. Deleted photos cannot be restored here."
        : "Fresh start. All nine photos are ready to review.",
    );
  }
  async function removeQueued() {
    if (removing || !queued.length) return;
    const snapshot = [...queued];
    setRemoving(true);
    try {
      const success = !phoneMode || (await removePhonePhotos(snapshot));
      if (!success) {
        setMessage("Removal cancelled. Your queue is still here.");
        return;
      }
      setSession((value) =>
        clearQueue(
          value,
          snapshot.map((photo) => photo.id),
        ),
      );
      setConfirm(false);
      setSheet(null);
      setMessage(
        phoneMode
          ? `${snapshot.length} photos removed from Photos. Edited copies are kept.`
          : `${snapshot.length} removed from the demo. Originals are untouched.`,
      );
    } catch {
      setMessage(
        "Photos could not be removed, or removal was cancelled. Your queue is unchanged.",
      );
    } finally {
      setRemoving(false);
    }
  }
  async function exportCopy(photo: Photo) {
    const edit = session.edits[photo.id];
    if (!edit || exporting) return;
    setExporting(true);
    try {
      if (Platform.OS === "web")
        downloadCopy(edit.uri, `keep-${photo.filename}`);
      else if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(edit.uri, {
          mimeType: "image/jpeg",
          dialogTitle: "Export edited copy",
        });
      else
        setMessage(
          "Sharing is unavailable on this device. The copy is saved in the app.",
        );
    } catch {
      setMessage("The copy could not be exported. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <GestureHandlerRootView style={s.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={s.app}>
          {!ready ? (
            <View style={s.empty}>
              <ActivityIndicator color={colors.accent} />
              <Text style={s.bodyText}>Opening your photos…</Text>
            </View>
          ) : (
            <>
              <View style={s.header}>
                <View style={s.brand}>
                  <View style={s.brandMark}>
                    <Icon
                      name="sparkles-outline"
                      color={colors.accent}
                      size={23}
                    />
                  </View>
                  <Text style={s.wordmark}>
                    keep<Text style={{ color: colors.accent }}>.</Text>
                  </Text>
                </View>
                <View style={s.headerRight}>
                  <Pill
                    text={
                      phoneMode
                        ? library.limited
                          ? "SELECTED PHOTOS"
                          : "YOUR PHOTOS"
                        : "DEMO ALBUM"
                    }
                  />
                  <IconButton
                    label="About and settings"
                    icon="options-outline"
                    onPress={() => setSheet("settings")}
                  />
                </View>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                onLayout={(event) => setReviewViewportHeight(event.nativeEvent.layout.height)}
                contentContainerStyle={s.content}
                showsVerticalScrollIndicator={false}
              >
                {!phoneMode && tab !== "clean" && (
                  <View style={{ marginBottom: 22 }}>
                    <Button
                      label="Use my phone photos"
                      icon="images-outline"
                      secondary
                      onPress={() => library.setPicker(true)}
                    />
                  </View>
                )}
                {tab !== "clean" && (
                  <>
                    <View style={s.sectionLabel}>
                      <Text style={s.eyebrow}>
                        {tab === "library" ? "YOUR LITTLE COLLECTION" : "A FRESH PERSPECTIVE"}
                      </Text>
                      <View style={s.smallDot} />
                    </View>
                    <Text style={s.heading}>
                      {tab === "library" ? "Your photos." : "Made yours."}
                    </Text>
                    <Text style={s.subtitle}>
                      {tab === "library"
                        ? `${photos.length} moments, ready for a second look.`
                        : "Your edited copies, all in one place."}
                    </Text>
                  </>
                )}
                {tab === "clean" ? (
                  <>
                    <View style={s.sessionLine}>
                      <View style={s.row}>
                        <Icon
                          name="folder-open-outline"
                          color={colors.accent}
                          size={16}
                        />
                        <Text
                          numberOfLines={1}
                          style={[s.albumName, { maxWidth: 150 }]}
                        >
                          {albumName}
                        </Text>
                        <Text style={s.albumCount}>{photos.length} photos</Text>
                      </View>
                      <Text style={s.progressText}>
                        {reviewed} / {photos.length} reviewed
                      </Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View
                        style={[
                          s.progressFill,
                          { width: `${(reviewed / photos.length) * 100}%` },
                        ]}
                      />
                    </View>
                    {current ? (
                      <SwipeCard
                        photos={photos}
                        albumName={albumName}
                        photo={current}
                        next={pending[1]}
                        height={cardHeight}
                        session={session}
                        onDecide={review}
                        onEdit={() => setEditorPhoto(current)}
                        onUndo={() => setSession(undo)}
                        canUndo={session.history.length > 0}
                      />
                    ) : (
                      <View style={[s.doneCard, { minHeight: cardHeight }]}>
                        <View style={s.doneIcon}>
                          <Icon
                            name="checkmark-outline"
                            color={colors.accent}
                            size={38}
                          />
                        </View>
                        <Text style={s.doneTitle}>A little lighter.</Text>
                        <Text style={s.doneText}>
                          Every photo has had its moment.{"\n"}You kept{" "}
                          {kept.length} and queued {queued.length} for removal.
                        </Text>
                        <Button
                          label={
                            queued.length
                              ? "Review removal queue"
                              : "Browse your keepers"
                          }
                          icon={
                            queued.length ? "trash-outline" : "heart-outline"
                          }
                          onPress={
                            queued.length
                              ? openQueue
                              : () => {
                                  setTab("library");
                                  setLibraryFilter("kept");
                                }
                          }
                        />
                        <View style={s.row}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={restart}
                          >
                            <Text style={s.textLink}>Review again</Text>
                          </Pressable>
                          {session.history.length > 0 && (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setSession(undo)}
                            >
                              <Text style={s.textLink}>Undo last swipe</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    )}
                    {!phoneMode && (
                      <View style={{ marginTop: 18 }}>
                        <Button
                          label="Use my photos"
                          icon="images-outline"
                          secondary
                          onPress={() => library.setPicker(true)}
                        />
                      </View>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Review removal queue, ${queued.length} photos`}
                      onPress={openQueue}
                      style={s.queueCard}
                    >
                      <View style={s.queueIcon}>
                        <Icon
                          name="trash-outline"
                          size={20}
                          color={colors.coral}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.queueTitle}>
                          {queued.length
                            ? `${queued.length} photo${queued.length === 1 ? "" : "s"} in your queue`
                            : "Your removal queue"}
                        </Text>
                        <Text style={s.queueSub}>
                          {queued.length
                            ? `${queueSizeLabel} · review before removing`
                            : "Nothing leaves until you review it."}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  </>
                ) : (
                  <>
                    {tab === "library" && (
                      <View style={s.filters}>
                        {(["all", "kept", "pending"] as const).map((value) => (
                          <Pressable
                            key={value}
                            accessibilityRole="tab"
                            accessibilityState={{
                              selected: libraryFilter === value,
                            }}
                            onPress={() => {
                              setGridPage(0);
                              setLibraryFilter(value);
                            }}
                            style={[
                              s.filter,
                              libraryFilter === value && s.filterActive,
                            ]}
                          >
                            <Text
                              style={[
                                s.filterText,
                                libraryFilter === value && { color: "white" },
                              ]}
                            >
                              {value === "all"
                                ? "All photos"
                                : value === "kept"
                                  ? `Kept · ${kept.length}`
                                  : `To review · ${pending.length}`}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {visible.length ? (
                      <View style={s.grid}>
                        {visible
                          .slice(gridPage * 40, (gridPage + 1) * 40)
                          .map((photo) => (
                            <Pressable
                              key={photo.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${photo.filename}`}
                              onPress={() => setPreviewPhoto(photo)}
                              style={[
                                s.gridCard,
                                {
                                  width: (Math.min(windowWidth, 480) - 54) / 2,
                                },
                              ]}
                            >
                              <Image
                                source={photoSource(photo, session)}
                                style={[
                                  s.gridImage,
                                  {
                                    height:
                                      (Math.min(windowWidth, 480) - 62) / 1.6,
                                  },
                                ]}
                              />
                              <View style={s.gridBadge}>
                                <Icon
                                  name={
                                    session.edits[photo.id]
                                      ? "options-outline"
                                      : session.decisions[photo.id] === "keep"
                                        ? "heart"
                                        : session.decisions[photo.id] ===
                                            "trash"
                                          ? "trash-outline"
                                          : "ellipse-outline"
                                  }
                                  size={13}
                                  color={
                                    session.decisions[photo.id] === "trash"
                                      ? colors.coral
                                      : colors.accent
                                  }
                                />
                              </View>
                              <View style={s.gridFooter}>
                                <Text numberOfLines={1} style={s.gridName}>
                                  Photo{" "}
                                  {String(photos.indexOf(photo) + 1).padStart(
                                    2,
                                    "0",
                                  )}
                                </Text>
                                <Text style={s.gridMeta}>
                                  {tab === "edits"
                                    ? "Edited copy"
                                    : formatBytes(photo.bytes)}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                      </View>
                    ) : (
                      <View style={s.galleryEmpty}>
                        <View style={s.doneIcon}>
                          <Icon
                            name={
                              tab === "edits"
                                ? "color-wand-outline"
                                : "images-outline"
                            }
                            color={colors.accent}
                            size={32}
                          />
                        </View>
                        <Text style={s.doneTitle}>
                          {tab === "edits"
                            ? "A little magic awaits."
                            : "No photos here yet."}
                        </Text>
                        <Text style={s.doneText}>
                          {tab === "edits"
                            ? "Open a photo and tap Edit.\nYour saved copies will appear here."
                            : "Keep a photo while swiping, or choose another view."}
                        </Text>
                        <Button
                          label="Back to your photos"
                          secondary
                          onPress={() => {
                            setTab("clean");
                          }}
                        />
                      </View>
                    )}
                    {tab === "library" && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={openQueue}
                        style={s.queueCard}
                      >
                        <Icon
                          name="trash-outline"
                          size={20}
                          color={colors.coral}
                        />
                        <Text style={[s.queueTitle, { flex: 1 }]}>
                          Review removal queue · {queued.length}
                        </Text>
                        <Icon name="chevron-forward" size={18} />
                      </Pressable>
                    )}
                  </>
                )}
                {tab !== "clean" && visible.length > 40 && (
                  <View style={{ gap: 12, marginBottom: 18 }}>
                    <Text style={s.bodyText}>
                      Page {gridPage + 1} of {Math.ceil(visible.length / 40)}
                    </Text>
                    <Button
                      label="Previous photos"
                      secondary
                      disabled={gridPage === 0}
                      onPress={() => setGridPage((value) => value - 1)}
                    />
                    <Button
                      label="Next photos"
                      secondary
                      disabled={(gridPage + 1) * 40 >= visible.length}
                      onPress={() => setGridPage((value) => value + 1)}
                    />
                  </View>
                )}
                {phoneMode && (
                  <View style={{ gap: 12, marginTop: 16 }}>
                    <Text style={s.bodyText}>
                      {photos.length} loaded ... {library.total} accessible
                      photos
                    </Text>
                    {library.hasNext && (
                      <Button
                        label={
                          library.busy ? "Loading..." : "Load next 40 photos"
                        }
                        secondary
                        disabled={library.busy}
                        onPress={library.loadMore}
                      />
                    )}
                    <Button
                      label="Choose another album or month"
                      secondary
                      onPress={() => library.setPicker(true)}
                    />
                  </View>
                )}
                <View style={s.localNote}>
                  <Icon
                    name="shield-checkmark-outline"
                    color={colors.muted}
                    size={12}
                  />
                  <Text style={s.localText}>On your device. At your pace.</Text>
                </View>
              </ScrollView>
              <View style={s.nav}>
                {[
                  { value: "clean", icon: "albums-outline", label: "Clean up" },
                  { value: "library", icon: "grid-outline", label: "Library" },
                  {
                    value: "edits",
                    icon: "color-wand-outline",
                    label: "Edits",
                  },
                ].map((item) => (
                  <Pressable
                    key={item.value}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: tab === item.value }}
                    onPress={() => setTab(item.value as typeof tab)}
                    style={s.navItem}
                  >
                    <View
                      style={[s.navIcon, tab === item.value && s.navIconActive]}
                    >
                      <Icon
                        name={item.icon as IconName}
                        size={21}
                        color={tab === item.value ? colors.paper : "#D9CDDF"}
                      />
                    </View>
                    <Text
                      style={[
                        s.navLabel,
                        tab === item.value && {
                          color: colors.lavender,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {!!message && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => setMessage("")}
              style={s.toast}
            >
              <Icon name="checkmark-circle-outline" color="white" size={18} />
              <Text style={s.toastText}>{message}</Text>
            </Pressable>
          )}
        </SafeAreaView>

        <Modal
          visible={sheet !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (removing) return;
            setSheet(null);
            setConfirm(false);
          }}
        >
          <View style={s.modalBackdrop}>
            <Pressable
              accessibilityLabel="Close panel"
              onPress={() => {
                if (removing) return;
                setSheet(null);
                setConfirm(false);
              }}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={s.sheet} edges={["bottom"]}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>
                    {sheet === "settings"
                      ? "Hello, keeper."
                      : confirm
                        ? "Ready to let these go?"
                        : "One last look."}
                  </Text>
                  <Text style={s.sheetSub}>
                    {sheet === "settings"
                      ? "A calmer home for your photos."
                      : phoneMode
                        ? "Review carefully. Removal affects your phone photo library."
                        : "Your originals stay safe in AppProjects."}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  label="Close panel"
                  onPress={() => {
                    if (removing) return;
                    setSheet(null);
                    setConfirm(false);
                  }}
                />
              </View>
              {sheet === "settings" ? (
                <View style={s.sheetBody}>
                  <Pill text="WORKING PROTOTYPE" icon="sparkles-outline" />
                  <Text style={s.bodyText}>
                    {phoneMode
                      ? "You are reviewing your phone photos. Swipe to keep or queue; nothing is deleted until you review and confirm removal."
                      : "Nine demo photos are bundled from AppProjects. Demo removal only changes this session."}
                  </Text>
                  <View style={s.infoBox}>
                    <Icon name="lock-closed-outline" color={colors.accent} />
                    <Text style={[s.bodyText, { flex: 1 }]}>
                      No account. No uploads. Your progress and edited copies
                      stay on this device.
                    </Text>
                  </View>
                  <Text style={s.bodyText}>
                    {phoneMode
                      ? "Start fresh resets swipe decisions. It does not restore deleted phone photos. Edited copies are kept."
                      : "Start fresh restores demo photos and resets swipe decisions. Edited copies are kept."}
                  </Text>
                  <Button
                    label="Choose photo collection"
                    icon="images-outline"
                    onPress={() => {
                      setSheet(null);
                      library.setPicker(true);
                    }}
                  />
                  <Button
                    label="Start fresh"
                    icon="refresh-outline"
                    secondary
                    onPress={restart}
                  />
                </View>
              ) : confirm ? (
                <View style={s.sheetBody}>
                  <View style={s.infoBox}>
                    <Icon name="trash-outline" color={colors.coral} />
                    <Text style={[s.bodyText, { flex: 1 }]}>
                      {phoneMode
                        ? `${queued.length} photos will be removed from your Photos library and its albums. Your phone will ask you to confirm. On iPhone, use Recently Deleted in Photos to recover them. Saved edited copies are kept.`
                        : `${queued.length} photos will be removed from this demo session. Original files and edited copies are untouched.`}
                    </Text>
                  </View>
                  <Button
                    label={
                      removing
                        ? "Waiting for your phone..."
                        : phoneMode
                          ? `Remove ${queued.length} from Photos`
                          : `Remove ${queued.length} from demo`
                    }
                    icon="trash-outline"
                    disabled={removing}
                    onPress={removeQueued}
                  />
                  <Button
                    label="Go back"
                    disabled={removing}
                    secondary
                    onPress={() => setConfirm(false)}
                  />
                </View>
              ) : (
                <>
                  <ScrollView
                    style={{ maxHeight: windowHeight * 0.45 }}
                    contentContainerStyle={s.sheetBody}
                  >
                    {queued.length ? (
                      queued.map((photo) => (
                        <View key={photo.id} style={s.queueRow}>
                          <Image
                            source={photoSource(photo, session)}
                            style={s.queueThumb}
                          />
                          <View style={{ flex: 1, gap: 5 }}>
                            <Text style={s.queueTitle}>
                              Photo{" "}
                              {String(photos.indexOf(photo) + 1).padStart(
                                2,
                                "0",
                              )}
                            </Text>
                            <Text style={s.queueSub}>
                              {formatBytes(photo.bytes)}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Keep ${photo.filename}`}
                            onPress={() =>
                              setSession((value) =>
                                decide(value, photo.id, "keep"),
                              )
                            }
                            style={s.restoreButton}
                          >
                            <Icon
                              name="heart-outline"
                              size={16}
                              color={colors.accent}
                            />
                            <Text style={s.restoreText}>Keep</Text>
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <View style={s.emptyQueue}>
                        <Icon
                          name="leaf-outline"
                          color={colors.accent}
                          size={35}
                        />
                        <Text style={s.doneTitle}>Nothing to let go of.</Text>
                        <Text style={s.doneText}>
                          Swipe left on a photo to add it here.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                  {queued.length > 0 && (
                    <View style={s.sheetBody}>
                      <View style={s.rowBetween}>
                        <Text style={s.bodyText}>
                          {queued.length} photos queued
                        </Text>
                        <Text style={s.queueTitle}>
                          {queueSizeLabel}
                        </Text>
                      </View>
                      <Text style={s.queueSub}>
                        {phoneMode
                          ? "Removal needs your phone's confirmation"
                          : "Demo only · no storage is reclaimed"}
                      </Text>
                      <Button
                        label="Review removal"
                        icon="trash-outline"
                        onPress={() => setConfirm(true)}
                      />
                    </View>
                  )}
                </>
              )}
            </SafeAreaView>
          </View>
        </Modal>

        <Modal
          visible={previewPhoto !== null}
          animationType="slide"
          onRequestClose={() => setPreviewPhoto(null)}
        >
          <SafeAreaView style={s.previewScreen}>
            {previewPhoto && (
              <>
                <View style={s.previewHeader}>
                  <IconButton
                    label="Close photo"
                    icon="close"
                    onPress={() => setPreviewPhoto(null)}
                  />
                  <Text
                    numberOfLines={1}
                    style={[s.queueTitle, { flex: 1, textAlign: "center" }]}
                  >
                    Photo{" "}
                    {String(photos.indexOf(previewPhoto) + 1).padStart(2, "0")}
                  </Text>
                  <IconButton
                    label="Edit photo"
                    icon="options-outline"
                    onPress={() => {
                      setEditorPhoto(previewPhoto);
                      setPreviewPhoto(null);
                    }}
                  />
                </View>
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  centerContent
                  contentContainerStyle={s.fullImageContainer}
                >
                  <Image
                    source={photoSource(previewPhoto, session)}
                    style={s.fullImage}
                    contentFit="contain"
                  />
                </ScrollView>
                <View style={s.previewFooter}>
                  <Text numberOfLines={1} style={s.filename}>
                    {previewPhoto.filename}
                  </Text>
                  <Text style={s.queueSub}>
                    {session.edits[previewPhoto.id]
                      ? `${session.edits[previewPhoto.id].width} × ${session.edits[previewPhoto.id].height} · Edited copy`
                      : `${previewPhoto.width} × ${previewPhoto.height} · ${formatBytes(previewPhoto.bytes)}`}
                  </Text>
                  <Button
                    label="Edit this photo"
                    icon="options-outline"
                    onPress={() => {
                      setEditorPhoto(previewPhoto);
                      setPreviewPhoto(null);
                    }}
                  />
                  {session.edits[previewPhoto.id] && (
                    <Button
                      label={exporting ? "Exporting…" : "Export edited copy"}
                      disabled={exporting}
                      icon="share-outline"
                      secondary
                      onPress={() => exportCopy(previewPhoto)}
                    />
                  )}
                </View>
              </>
            )}
          </SafeAreaView>
        </Modal>
        <Modal
          visible={editorPhoto !== null}
          animationType="slide"
          onRequestClose={() => setEditorPhoto(null)}
        >
          {editorPhoto && (
            <Editor
              key={editorPhoto.id}
              photo={editorPhoto}
              edit={session.edits[editorPhoto.id]}
              onClose={() => setEditorPhoto(null)}
              onSave={(edit) => {
                setSession((value) => ({
                  ...value,
                  edits: { ...value.edits, [editorPhoto.id]: edit },
                }));
                setEditorPhoto(null);
                setMessage(
                  edit.libraryAssetId
                    ? "New JPEG saved to Photos. Also available in Edits."
                    : "Edited copy saved. Find it in Edits.",
                );
              }}
            />
          )}
        </Modal>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = themedStyles({
  root: { flex: 1, backgroundColor: "#EAE6EF" },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    overflow: "hidden",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.ink,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderColor: colors.ink,
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandMark: {
    width: 37,
    height: 37,
    backgroundColor: colors.yellow,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: "2px 2px 0 #222222",
    transform: [{ rotate: "-6deg" }],
  },
  wordmark: {
    fontSize: 29,
    letterSpacing: -2,
    color: colors.ink,
    fontWeight: "700",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 9 },
  content: { paddingHorizontal: 22, paddingBottom: 14 },
  sectionLabel: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 9,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.ink,
    letterSpacing: 0.4,
  },
  smallDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.purple,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  heading: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.5,
    color: colors.ink,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  sessionLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  albumName: { fontSize: 11, fontWeight: "600", color: colors.ink },
  albumCount: { fontSize: 10, color: colors.muted },
  progressText: { fontSize: 10, color: colors.ink },
  progressTrack: {
    height: 8,
    backgroundColor: colors.paper,
    borderRadius: 3,
    marginBottom: 19,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.purple,
    borderRadius: 0,
  },
  cardArea: { width: "100%", marginBottom: 7 },
  photoCard: {
    flex: 1,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: colors.lavender,
    boxShadow: "4px 4px 0 #222222",
    borderWidth: 2.5,
    borderColor: colors.ink,
  },
  cover: { width: "100%", height: "100%" },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "45%",
  },
  cardTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.paper,
  },
  photoTagText: { color: "white", fontSize: 9 },
  cardBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 100,
    flexDirection: "row",
    alignItems: "center",
  },
  photoLabel: { color: "white", fontSize: 17, fontWeight: "600" },
  photoMeta: { color: "#FFFFFFB0", fontSize: 10 },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: 5,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.paper,
    boxShadow: "2px 2px 0 #222222",
  },
  editChipText: { color: "white", fontSize: 11, fontWeight: "500" },
  stamp: {
    position: "absolute",
    top: 80,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderWidth: 3,
    borderRadius: 3,
    backgroundColor: "#17261A70",
  },
  keepStamp: {
    left: 22,
    borderColor: "#E3FFC0",
    transform: [{ rotate: "-13deg" }],
  },
  trashStamp: {
    right: 22,
    borderColor: "#FFE1D3",
    transform: [{ rotate: "13deg" }],
  },
  stampText: { fontSize: 28, fontWeight: "800", letterSpacing: 2 },
  actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
    paddingTop: 14,
    paddingBottom: 19,
  },
  actionCircle: {
    width: 61,
    height: 61,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: hardShadow,
  },
  trashCircle: { backgroundColor: colors.peach, borderColor: colors.ink },
  keepCircle: { backgroundColor: colors.lime, borderColor: colors.ink },
  undoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "2px 2px 0 #222222",
  },
  queueCard: {
    backgroundColor: colors.yellow,
    borderRadius: 7,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: hardShadow,
  },
  queueIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.peach,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  queueTitle: { fontSize: 11, fontWeight: "600", color: colors.ink },
  queueSub: { fontSize: 9, lineHeight: 15, color: colors.ink },
  localNote: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 15,
  },
  localText: { fontSize: 9, color: colors.muted },
  nav: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 9,
    borderTopWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.ink,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navIcon: {
    width: 51,
    height: 31,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: {
    backgroundColor: colors.purple,
    borderWidth: 1,
    borderColor: colors.paper,
  },
  navLabel: { fontSize: 10, color: "#E6DEEE" },
  doneCard: {
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
    gap: 17,
    marginBottom: 19,
    boxShadow: hardShadow,
  },
  doneIcon: {
    width: 74,
    height: 74,
    borderRadius: 8,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.ink,
  },
  doneTitle: {
    fontSize: 22,
    color: colors.ink,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  doneText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
  },
  textLink: {
    fontSize: 11,
    color: colors.ink,
    padding: 5,
    textDecorationLine: "underline",
  },
  filters: { flexDirection: "row", gap: 6, marginBottom: 18 },
  filter: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  filterActive: {
    backgroundColor: colors.accent,
    boxShadow: "2px 2px 0 #222222",
  },
  filterText: { fontSize: 10, fontWeight: "600", color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  gridCard: {
    backgroundColor: "white",
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: "2px 2px 0 #222222",
  },
  gridImage: { width: "100%" },
  gridFooter: { padding: 11, gap: 4, backgroundColor: colors.yellow },
  gridName: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  gridMeta: { fontSize: 9, color: colors.muted },
  gridBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    backgroundColor: colors.mint,
    borderRadius: 5,
    padding: 6,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  galleryEmpty: {
    minHeight: 330,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  toast: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 9,
    backgroundColor: colors.ink,
    borderRadius: 7,
    padding: 14,
    alignItems: "center",
    boxShadow: hardShadow,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  toastText: { color: "white", fontSize: 11, lineHeight: 17, flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#22222290",
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: colors.bg,
    overflow: "hidden",
    paddingBottom: 15,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 0,
    backgroundColor: colors.ink,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  sheetHeader: {
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 17,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  sheetSub: { color: colors.muted, fontSize: 11, marginTop: 7 },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 16, gap: 15 },
  bodyText: { fontSize: 12, color: colors.muted, lineHeight: 21 },
  infoBox: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: colors.mint,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  queueThumb: {
    width: 53,
    height: 66,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  restoreButton: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: colors.lime,
    padding: 11,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  restoreText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  emptyQueue: { paddingVertical: 25, alignItems: "center", gap: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
  },
  fullImageContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "100%", height: "100%", minHeight: 250 },
  previewFooter: {
    padding: 20,
    gap: 10,
    borderTopWidth: 2,
    borderColor: colors.ink,
  },
  filename: { fontSize: 12, color: colors.ink, fontWeight: "600" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
});
