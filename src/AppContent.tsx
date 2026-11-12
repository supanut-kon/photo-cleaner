import { useTheme, useThemedStyles, type Palette } from "./ui";
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
  Switch,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { BlurTargetView } from "expo-blur";
import TopFade from "./TopFade";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  useReducedMotion,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
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
  Backdrop,
  hardShadow,
  themedStyles,
  Icon,
  IconButton,
  Pill,
} from "./ui";
import SoftPhoto from "./SoftPhoto";
import CleanupTools from "./CleanupTools";
import { cleanupProgress, type CleanupFilter } from "./cleanup";
import {
  CollectionPicker,
  useCollection,
  type Collection,
} from "./Collections";
import { removePhonePhotos } from "./phoneLibrary";
import { summarizePhotoSizes } from "./photoSizes";

const sessionWrites = { current: Promise.resolve() };
const STORAGE_KEY = "keep.prototype.session.v1";
type SwipePhotoCardProps = {
  photos: Photo[];
  albumName: string;
  photo: Photo;
  active: boolean;
  session: Session;
  onMotion: (moving: boolean) => void;
  onDecide: (decision: Decision) => void;
  returning?: { id: string; direction: number };
  onReturned: () => void;
};

type SwipeCardHandle = { fly: (decision: Decision) => void };

const SwipePhotoCard = forwardRef<SwipeCardHandle, SwipePhotoCardProps>(function SwipePhotoCard({
  photo,
  active,
  onMotion,
  onDecide,
  returning,
  onReturned,
}, ref) {
  const s = useThemedStyles(createStyles);
  const sizeLabel = formatBytes(photo.bytes);
  const sizeParts = sizeLabel.match(/^(.*) (KB|MB)$/);
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(returning && !reducedMotion ? returning.direction * 650 : 0),
    y = useSharedValue(0),
    locked = useSharedValue(Boolean(returning));
  useEffect(() => {
    if (!returning) return;
    onMotion(true);
    x.set(withTiming(0, { duration: reducedMotion ? 0 : 340 }, (finished) => {
      if (finished) {
        locked.set(false);
        runOnJS(onMotion)(false);
        runOnJS(onReturned)();
      }
    }));
  }, [returning, reducedMotion, x, locked, onMotion, onReturned]);
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
      <View style={StyleSheet.absoluteFill}>
      <SoftPhoto source={photo.source}
        width={photo.width}
        height={photo.height} />
      </View>
      <View style={s.cardTop}>
        <View style={s.photoDetails}>
          <Text numberOfLines={1} style={s.photoSize}>
            {sizeParts ? <>{sizeParts[1]}<Text style={s.photoUnit}> {sizeParts[2].toLowerCase()}</Text></> : sizeLabel}
          </Text>
        </View>
      </View>
      <Animated.View style={[s.stamp, s.keepStamp, keepStyle]}>
        <Text style={[s.stampText, { color: "#E3FFC0" }]}>KEEP</Text>
      </Animated.View>
      <Animated.View style={[s.stamp, s.trashStamp, trashStyle]}>
        <Text style={[s.stampText, { color: "#FFE1D3" }]}>REMOVE</Text>
      </Animated.View>
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
  onUndo,
  canUndo,
  returning,
  onReturned,
}: {
  photos: Photo[];
  albumName: string;
  photo: Photo;
  next?: Photo;
  session: Session;
  height: number;
  onDecide: (decision: Decision) => void;
  onUndo: () => void;
  canUndo: boolean;
  returning: { id: string; direction: number } | null;
  onReturned: () => void;
}) {

  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
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
            returning={returning?.id === item.id ? returning : undefined}
            onReturned={onReturned}
            onMotion={setMoving}
            onDecide={onDecide}
          />
        ))}
      </View>
      <View pointerEvents="box-none" style={s.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark photo for removal"
          disabled={moving || Boolean(returning)}
          onPress={() => activeCard.current?.fly("trash")}
          style={({ pressed }) => [
            s.actionCircle,
            s.trashCircle,
            pressed && {
              transform: [{ scale: 0.96 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="trash-outline" size={23} color={colors.coral} />
          <Text style={[s.actionLabel, { color: colors.coral }]}>Remove</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last decision"
          accessibilityState={{ disabled: !canUndo || moving || Boolean(returning) }}
          disabled={!canUndo || moving || Boolean(returning)}
          onPress={onUndo}
          style={({ pressed }) => [
            s.undoCircle,
            (!canUndo || moving || Boolean(returning)) && { opacity: 0.35 },
            pressed && {
              transform: [{ scale: 0.96 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="arrow-undo" color={colors.ink} size={20} />
          <Text style={s.undoLabel}>Undo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep photo"
          disabled={moving || Boolean(returning)}
          onPress={() => activeCard.current?.fly("keep")}
          style={({ pressed }) => [
            s.actionCircle,
            s.keepCircle,
            pressed && {
              transform: [{ scale: 0.96 }],
              boxShadow: "none",
            },
          ]}
        >
          <Icon name="checkmark" size={25} color={colors.accent} />
          <Text style={[s.actionLabel, { color: colors.accent }]}>Keep</Text>
        </Pressable>
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
  const { colors, dark, setDark } = useTheme();
  const s = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<React.ComponentRef<typeof View>>(null);
  const [returning, setReturning] = useState<{ id: string; direction: number } | null>(null);
  const undoLock = useRef(false);
  const [undoFocus, setUndoFocus] = useState<string | null>(null);
  const finishUndo = useCallback(() => {
    undoLock.current = false;
    setReturning(null);
  }, []);
  const photos = library.photos;
  const phoneMode = library.selection.mode === "phone";
  const storageKey = phoneMode ? "keep.phone.session.v1" : STORAGE_KEY;
  const albumName = phoneMode
    ? (library.selection.title ?? "Your Photos")
    : "AppProjects";
  const [removing, setRemoving] = useState(false);
  const [cleanupFilter, setCleanupFilter] = useState<CleanupFilter>("all");
  const [session, setSession] = useState<Session>(emptySession),
    [ready, setReady] = useState(false);
  const params = useLocalSearchParams<{
    panel?: string;
  }>();
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
  const [message, setMessage] = useState("");
  const writes = sessionWrites;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [reviewViewportHeight, setReviewViewportHeight] = useState(0);
  // Leave room for the compact header, filters, controls and queue.
  const cardHeight = Math.max(240, (reviewViewportHeight || windowHeight) - insets.top - insets.bottom - 370);
  useEffect(() => {
    let active = true;
    writes.current
      .then(() => AsyncStorage.getItem(storageKey))
      .then((raw) => {
        const restored = restoreSession(
          raw,
          phoneMode ? undefined : demoPhotos.map((p) => p.id),
        );
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
        if (sheet) {
          setSheet(null);
          setConfirm(false);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [
    sheet,
    setSheet,
    removing,
  ]);

  const cleanup = cleanupProgress(photos, cleanupFilter, session.decisions, session.removed);
  const pending = cleanup.pending;
  const kept = photos.filter((p) => session.decisions[p.id] === "keep");
  const queued = photos.filter((p) => session.decisions[p.id] === "trash");
  const queueSizes = summarizePhotoSizes(queued);
  const queueSizeLabel = queueSizes.unknown && queueSizes.bytes > 0
    ? `${formatBytes(queueSizes.bytes)} known · ${queueSizes.unknown} sizes unavailable`
    : formatBytes(queueSizes.bytes);
  const reviewed = cleanup.reviewed;
  const current = pending.find((photo) => photo.id === undoFocus) ?? pending[0];
  const undoId = session.history.at(-1);
  const canUndo = Boolean(undoId && photos.some((photo) => photo.id === undoId));
  function undoLast() {
    if (!undoId || !canUndo || undoLock.current) return;
    undoLock.current = true;
    setUndoFocus(undoId);
    setReturning({ id: undoId, direction: session.decisions[undoId] === "keep" ? 1 : -1 });
    if (!cleanup.matching.some((photo) => photo.id === undoId)) setCleanupFilter("all");
    setSession(undo);
  }
  function openQueue() {
    setSheet("queue");
    setConfirm(false);
  }
  function review(decision: Decision) {
    if (!current) return;
    setUndoFocus(null);
    setSession((value) => decide(value, current.id, decision));
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
  }
  function restart() {
    setSession((value) => ({
      ...emptySession(),
      removed: phoneMode ? value.removed : [],
    }));
    setSheet(null);
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
          ? `${snapshot.length} photos removed from Photos.`
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
  return (
    <GestureHandlerRootView style={s.root}>
      <SafeAreaProvider>
        <StatusBar style={dark ? "light" : "dark"} />
        <View style={s.app}>
          <Backdrop />
          {!ready ? (
            <View style={s.empty}>
              <ActivityIndicator color={colors.accent} />
              <Text style={s.bodyText}>Opening your photos…</Text>
            </View>
          ) : (
            <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                onLayout={(event) => setReviewViewportHeight(event.nativeEvent.layout.height)}
                contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}

              >
                  <>
                    <View style={s.reviewHeader}>
                      <Text style={s.wordmark}>Swipy</Text>
                      <IconButton label="About and settings" icon="options-outline"
                        onPress={() => setSheet("settings")} />
                    </View>
                    <View style={s.sessionLine}>
                      <Pressable style={s.row} accessibilityRole="button" accessibilityLabel="Choose album or month"
                        onPress={() => library.setPicker(true)}>
                        <Icon
                          name="folder-open-outline"
                          color={colors.accent}
                          size={16}
                        />
                        <Text
                          numberOfLines={1}
                          style={[s.albumName, { maxWidth: Math.min(150, windowWidth * 0.25) }]}
                        >
                          {albumName}
                        </Text>
                        <Text style={s.albumCount}>{cleanup.matching.length} photos</Text>
                      </Pressable>
                      <Text style={s.progressText}>
                        {reviewed} / {cleanup.matching.length} reviewed
                      </Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View
                        style={[
                          s.progressFill,
                          { width: `${cleanup.matching.length ? (reviewed / cleanup.matching.length) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                    <CleanupTools selected={cleanupFilter} onSelect={(filter) => { if (!undoLock.current) setCleanupFilter(filter); }}
                      counts={Object.fromEntries((["all", "screenshots", "large"] as const).map((filter) =>
                        [filter, cleanupProgress(photos, filter, session.decisions, session.removed).pending.length])) as Record<CleanupFilter, number>}
                      savings={queueSizes.bytes ? `${queueSizes.unknown ? "At least " : ""}${formatBytes(queueSizes.bytes)}` : queued.length ? "Unknown size" : "0 KB"}
                      unknown={photos.filter((photo) => !session.removed.includes(photo.id) && !photo.bytes).length}
                      paged={library.hasNext} />
                    {current ? (
                      <SwipeCard
                        photos={photos}
                        albumName={albumName}
                        photo={current}
                        next={pending.find((photo) => photo.id !== current.id)}
                        height={cardHeight}
                        session={session}
                        onDecide={review}
                        onUndo={undoLast}
                        canUndo={canUndo}
                        returning={returning}
                        onReturned={finishUndo}
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
                        <Text style={s.doneTitle}>{library.hasNext ? "Next batch?" : cleanupFilter !== "all" ? cleanup.matching.length ? "All caught up." : "No matches." : "A little lighter."}</Text>
                        <Text style={s.doneText}>
                          {library.hasNext ? "No more matching photos in this batch. Load more to keep reviewing."
                            : cleanupFilter !== "all" ? `No unreviewed ${cleanupFilter === "large" ? "photos of 1 MB or more" : "screenshots"} in this collection.`
                            : `You kept ${kept.length} and queued ${queued.length} for removal.`}
                        </Text>
                        {library.hasNext && <Button label={library.busy ? "Loading…" : "Load next 40 photos"}
                          disabled={library.busy} onPress={library.loadMore} icon="add-outline" />}
                        {cleanupFilter !== "all" && <Button label="Review all photos" secondary
                          onPress={() => setCleanupFilter("all")} />}
                        <Button label={queued.length ? "Review removal queue" : "Choose another collection"}
                          icon={queued.length ? "trash-outline" : "folder-open-outline"}
                          onPress={queued.length ? openQueue : () => library.setPicker(true)} />
                        <View style={s.row}>
                          {cleanupFilter === "all" && <Pressable
                            accessibilityRole="button"
                            onPress={restart}
                          >
                            <Text style={s.textLink}>Review again</Text>
                          </Pressable>}
                          {canUndo && (
                            <Pressable
                              accessibilityRole="button"
                              onPress={undoLast}
                            >
                              <Text style={s.textLink}>Undo last swipe</Text>
                            </Pressable>
                          )}
                        </View>
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
                            ? `${queueSizeLabel} to clear · review first`
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
            </BlurTargetView>
          )}
          <TopFade height={insets.top + 24} target={blurTarget} dark={dark} />

          {!!message && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => setMessage("")}
              style={s.toast}
            >
              <Icon name="checkmark-circle-outline" color={colors.accent} size={18} />
              <Text style={s.toastText}>{message}</Text>
            </Pressable>
          )}
        </View>

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
                  <View style={s.appearanceRow}>
                    <Icon name={dark ? "moon-outline" : "sunny-outline"} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.appearanceTitle}>Dark mode</Text>
                      <Text style={s.appearanceNote}>{dark ? "Dark appearance" : "Light appearance"}</Text>
                    </View>
                    <Switch value={dark} onValueChange={setDark} accessibilityLabel="Dark mode"
                      trackColor={{ false: colors.line, true: colors.accent }}
                      thumbColor={dark ? "#F1F5FC" : "#FFFFFF"} />
                  </View>
                  <Pill text="WORKING PROTOTYPE" icon="sparkles-outline" />
                  <Text style={s.bodyText}>
                    {phoneMode
                      ? "You are reviewing your phone photos. Swipe to keep or queue; nothing is deleted until you review and confirm removal."
                      : "Nine demo photos are bundled from AppProjects. Demo removal only changes this session."}
                  </Text>
                  <View style={s.infoBox}>
                    <Icon name="lock-closed-outline" color={colors.accent} />
                    <Text style={[s.bodyText, { flex: 1 }]}>
                      No account. No uploads. Your progress
                      stay on this device.
                    </Text>
                  </View>
                  <Text style={s.bodyText}>
                    {phoneMode
                      ? "Start fresh resets swipe decisions. It does not restore deleted phone photos."
                      : "Start fresh restores demo photos and resets swipe decisions."}
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
                        ? `${queued.length} photos will be removed from your Photos library and its albums. Your phone will ask you to confirm. On iPhone, use Recently Deleted in Photos to recover them.`
                        : `${queued.length} photos will be removed from this demo session. Original files are untouched.`}
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
                            source={photo.source}
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

      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: Palette) => themedStyles({
  root: { flex: 1, backgroundColor: colors.bg },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    overflow: "hidden",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: colors.line,
  },
  content: { paddingHorizontal: 18 },
  sectionLabel: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 9,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.4,
  },
  smallDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.purple,
    borderWidth: 2,
    borderColor: colors.line,
  },
  heading: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.5,
    color: colors.ambientInk,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 11,
    color: colors.ambientMuted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  reviewHeader: { marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordmark: { fontSize: 38, lineHeight: 42, color: colors.ink },
  reviewTagline: { fontSize: 12, fontWeight: "700", color: colors.muted },
  sessionLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  albumName: { fontSize: 11, fontWeight: "800", color: colors.ambientInk },
  albumCount: { fontSize: 12, color: colors.ambientMuted },
  progressText: { fontSize: 12, color: colors.ambientInk, fontWeight: "800" },
  progressTrack: {
    height: 8,
    backgroundColor: colors.paper,
    borderRadius: 3,
    marginBottom: 19,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.line,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.purple,
    borderRadius: 0,
  },
  cardArea: { width: "100%", marginBottom: 7 },
  photoCard: {
    flex: 1,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.lavender,
    boxShadow: hardShadow,
    borderWidth: 2,
    borderColor: colors.line,
  },
  cover: { width: "100%", height: "100%" },
  cardTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoDetails: { maxWidth: "70%", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 4, overflow: "hidden", backgroundColor: colors.badge, borderWidth: 2, borderColor: colors.line, boxShadow: hardShadow },
  photoSize: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  photoUnit: { color: colors.ink, fontSize: 14, fontWeight: "400" },
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
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  actionCircle: {
    overflow: "hidden",
    flex: 1,
    maxWidth: 96,
    height: 64,
    borderRadius: 4,
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.line,
    boxShadow: hardShadow,
  },
  actionLabel: { fontSize: 13, fontWeight: "800" },
  undoLabel: { fontSize: 11, color: colors.ink, fontWeight: "800" },
  trashCircle: { backgroundColor: colors.trashControl, borderColor: colors.line },
  keepCircle: { backgroundColor: colors.keepControl, borderColor: colors.line },
  undoCircle: {
    overflow: "hidden",
    width: 48,
    height: 64,
    borderRadius: 4,
    gap: 4,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.softControl,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: hardShadow,
  },
  queueCard: {
    overflow: "hidden",
    marginTop: 12,
    backgroundColor: colors.yellow,
    borderRadius: 4,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.line,
    boxShadow: hardShadow,
  },
  queueIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.peach,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.line,
  },
  queueTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  queueSub: { fontSize: 12, lineHeight: 18, color: colors.muted },
  localNote: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 15,
  },
  localText: { fontSize: 11, color: colors.ambientMuted },
  doneCard: {
    overflow: "hidden",
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 4,
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
    borderRadius: 4,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.line,
  },
  doneTitle: {
    fontSize: 22,
    color: colors.ink,
    fontWeight: "800",
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
    color: colors.ambientInk,
    padding: 5,
    textDecorationLine: "underline",
  },
  filters: { flexDirection: "row", gap: 6, marginBottom: 18 },
  filter: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
  },
  filterActive: {
    backgroundColor: colors.selection,
    boxShadow: hardShadow,
  },
  filterText: { fontSize: 10, fontWeight: "800", color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  gridCard: {
    backgroundColor: colors.paper,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.line,
    boxShadow: hardShadow,
  },
  gridImage: { width: "100%" },
  gridFooter: { padding: 13, gap: 5, backgroundColor: colors.paper },
  gridName: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  gridMeta: { fontSize: 9, color: colors.muted },
  gridBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    backgroundColor: colors.mint,
    borderRadius: 4,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.line,
  },
  galleryEmpty: {
    minHeight: 330,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  toast: {
    overflow: "hidden",
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 9,
    backgroundColor: colors.paper,
    borderRadius: 4,
    padding: 14,
    alignItems: "center",
    boxShadow: hardShadow,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  toastText: { color: colors.ink, fontSize: 11, lineHeight: 17, flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#000000B0",
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: colors.bg,
    overflow: "hidden",
    paddingBottom: 15,
    borderWidth: 2,
    borderColor: colors.line,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paper,
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
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  sheetSub: { color: colors.muted, fontSize: 11, marginTop: 7 },
  appearanceRow: { flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 4, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.line },
  appearanceTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  appearanceNote: { fontSize: 10, color: colors.muted, marginTop: 4 },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 16, gap: 15 },
  bodyText: { fontSize: 12, color: colors.muted, lineHeight: 21 },
  infoBox: {
    overflow: "hidden",
    padding: 15,
    borderRadius: 4,
    backgroundColor: colors.mint,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: colors.line,
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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.line,
  },
  restoreButton: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: colors.lime,
    padding: 11,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.line,
  },
  restoreText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  emptyQueue: { paddingVertical: 25, alignItems: "center", gap: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
});
