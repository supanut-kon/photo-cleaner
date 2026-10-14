import { useTheme, useThemedStyles, type Palette } from "./ui";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { shouldLoadFromPull } from "./libraryPaging";
import { type Photo } from "./photos";
import { type Session } from "./session";
import { Icon, themedStyles } from "./ui";

type Filter = "all" | "kept" | "pending";
const columns = 4;
const gap = 3;

type TileProps = {
  photo: Photo; editUri?: string; decision?: Session["decisions"][string];
  size: number; onOpen: (photo: Photo) => void;
};
const PhotoTile = memo(function PhotoTile({ photo, editUri, decision, size, onOpen }: TileProps) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  const source = useMemo(() => editUri ? { uri: editUri } : photo.source, [editUri, photo.source]);
  const dimensions = useMemo(() => ({ width: size, height: size }), [size]);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${photo.filename}`}
    onPress={() => onOpen(photo)} style={[s.tile, dimensions]}>
    <Image source={source} style={StyleSheet.absoluteFill}
      contentFit="cover" cachePolicy="memory-disk" allowDownscaling autoplay={false}
      recyclingKey={`${photo.id}:${editUri ?? "original"}`} transition={0} />
    {(editUri || decision) && <View style={s.badge}>
      <Icon name={editUri ? "options-outline" : decision === "keep" ? "heart" : "trash-outline"}
        size={11} color={decision === "trash" ? colors.coral : colors.accent} />
    </View>}
  </Pressable>;
}, (previous, next) =>
  // Byte-size changes don't affect thumbnails; opening routes by ID to current metadata.
  previous.photo.id === next.photo.id && previous.photo.filename === next.photo.filename
  && previous.photo.source === next.photo.source && previous.editUri === next.editUri
  && previous.decision === next.decision && previous.size === next.size && previous.onOpen === next.onOpen);

const photoKey = (photo: Photo) => photo.id;

export default function LibraryGallery({ photos, session, filter, onFilter, keptCount,
  pendingCount, queuedCount, total, phoneMode, busy, hasNext, error, loadMore,
  onOpen, onQueue, onConnect, onScrollOffset }: {
  photos: Photo[]; session: Session; filter: Filter; onFilter: (filter: Filter) => void;
  keptCount: number; pendingCount: number; queuedCount: number; total: number;
  phoneMode: boolean; busy: boolean; hasNext: boolean; error: string;
  loadMore: () => Promise<void>; onOpen: (photo: Photo) => void;
  onQueue: () => void; onConnect: () => void;
  onScrollOffset: (offset: number) => void;
}) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const [pullReady, setPullReady] = useState(false);
  const list = useRef<FlatList<Photo>>(null);
  const scrollMetrics = useRef({ height: 0, contentHeight: 0, offset: 0 });
  const atBottom = useSharedValue(false);
  const startedAtBottom = useSharedValue(false);
  const armed = useSharedValue(false);
  const updateBottom = useCallback(() => {
    const { height, contentHeight, offset } = scrollMetrics.current;
    atBottom.set(height > 0 && offset + height >= contentHeight - 12);
  }, [atBottom]);
  const tileSize = Math.max(1, (width - gap * (columns - 1)) / columns);
  const loadNext = useCallback(() => {
    if (!hasNext || busy) return;
    // The collection's synchronous lock prevents overlapping page requests.
    void loadMore();
  }, [hasNext, busy, loadMore]);
  const renderPhoto = useCallback<ListRenderItem<Photo>>(({ item }) => <PhotoTile
    photo={item} editUri={session.edits[item.id]?.uri} decision={session.decisions[item.id]}
    size={tileSize} onOpen={onOpen} />, [session.edits, session.decisions, tileSize, onOpen]);

  const pull = Gesture.Pan()
    .enabled(hasNext && !busy)
    .activeOffsetY(-8)
    .failOffsetX([-25, 25])
    .onBegin(() => {
      startedAtBottom.set(atBottom.get());
      armed.set(false);
    })
    .onUpdate((event) => {
      const ready = shouldLoadFromPull(startedAtBottom.get(), event.translationY);
      if (ready !== armed.get()) {
        armed.set(ready);
        runOnJS(setPullReady)(ready);
      }
    })
    .onEnd((event) => {
      if (shouldLoadFromPull(startedAtBottom.get(), event.translationY)) runOnJS(loadNext)();
    })
    .onFinalize(() => {
      armed.set(false);
      runOnJS(setPullReady)(false);
    });
  const scrollGesture = Gesture.Simultaneous(Gesture.Native(), pull);

  return <View style={s.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 && <GestureDetector gesture={scrollGesture}><FlatList
      ref={list}
      data={photos}
      extraData={session}
      keyExtractor={photoKey}
      numColumns={columns}
      columnWrapperStyle={s.row}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      // With numColumns these counts refer to rows, not individual photos.
      initialNumToRender={6}
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      onLayout={(event) => {
        scrollMetrics.current.height = event.nativeEvent.layout.height;
        updateBottom();
      }}
      onContentSizeChange={(_, height) => {
        scrollMetrics.current.contentHeight = height;
        updateBottom();
      }}
      onScroll={({ nativeEvent }) => {
        scrollMetrics.current.offset = nativeEvent.contentOffset.y;
        updateBottom();
        onScrollOffset(Math.min(nativeEvent.contentOffset.y,
          Math.max(0, nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height)));
      }}
      scrollEventThrottle={16}
      ListHeaderComponent={<View style={s.header}>
        <Text style={s.eyebrow}>YOUR LITTLE COLLECTION</Text>
        <Text style={s.title}>Your photos.</Text>
        <Text style={s.subtitle}>{total} photos · {filter === "all" ? "All photos" : filter === "kept" ? "Kept" : "To review"}</Text>
        {!phoneMode && <Pressable accessibilityRole="button" onPress={onConnect} style={s.connect}>
          <Icon name="images-outline" color={colors.accent} size={17} />
          <Text style={s.connectText}>Use my phone photos</Text>
        </Pressable>}
        <View style={s.filters}>
          {(["all", "kept", "pending"] as const).map((value) => <Pressable key={value}
            accessibilityRole="tab" accessibilityState={{ selected: filter === value }}
            onPress={() => { onFilter(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }}
            style={[s.filter, filter === value && s.activeFilter]}>
            <Text style={[s.filterText, filter === value && { color: colors.accent }]}>
              {value === "all" ? "All photos" : value === "kept" ? `Kept · ${keptCount}` : `To review · ${pendingCount}`}
            </Text>
          </Pressable>)}
        </View>
        <Pressable accessibilityRole="button" onPress={onQueue} style={s.queue}>
          <Icon name="trash-outline" size={17} color={colors.coral} />
          <Text style={s.queueText}>Review removal queue · {queuedCount}</Text>
          <Icon name="chevron-forward" size={16} />
        </Pressable>
      </View>}
      renderItem={renderPhoto}
      ListEmptyComponent={!busy ? <View style={s.empty}>
        <Icon name="images-outline" size={30} color={colors.accent} />
        <Text style={s.emptyTitle}>No photos here yet.</Text>
        <Text style={s.subtitle}>{hasNext ? "No matches in the loaded photos. Pull up below to check the next batch." : "Try another view or keep a photo while swiping."}</Text>
      </View> : null}
      ListFooterComponent={<View style={s.footer}>
        {busy && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading photos" />}
        {!busy && hasNext && <Pressable onPress={loadNext} accessibilityRole="button"
          accessibilityLabel="Load 40 more photos" accessibilityHint="You can also pull up at the bottom and release."
          style={s.pullHint}>
          <Icon name={pullReady ? "arrow-up" : "chevron-up"} size={20} color={colors.accent} />
          <Text style={s.pullText}>{pullReady ? "Release to load 40 more" : error ? "Tap to retry loading" : "Pull up to load 40 more"}</Text>
        </Pressable>}
        {!busy && !hasNext && photos.length > 0 && <Text style={s.note}>All photos loaded</Text>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Text style={s.note}>On your device. At your pace.</Text>
      </View>}
    /></GestureDetector>}
  </View>;
}

const createStyles = (colors: Palette) => themedStyles({
  container: { flex: 1, marginHorizontal: 8 },
  content: { paddingBottom: 110 },
  row: { gap, marginBottom: gap },
  header: { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 12, backgroundColor: colors.header, borderRadius: 18, marginBottom: 8 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 1.5, color: colors.muted },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink, marginTop: 8 },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 6 },
  connect: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
  connectText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  filters: { flexDirection: "row", gap: 6, marginTop: 18 },
  filter: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44,
    borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  activeFilter: { backgroundColor: colors.selection },
  filterText: { fontSize: 10, fontWeight: "600", color: colors.ink },
  queue: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, marginTop: 4 },
  queueText: { flex: 1, fontSize: 11, fontWeight: "600", color: colors.ink },
  tile: { overflow: "hidden", backgroundColor: colors.lavender },
  badge: { position: "absolute", right: 4, bottom: 4, width: 20, height: 20,
    alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.badge },
  empty: { padding: 24, backgroundColor: colors.paper, borderRadius: 18, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  footer: { padding: 18, backgroundColor: colors.paper, borderRadius: 18, alignItems: "center", gap: 12 },
  pullHint: { minHeight: 64, alignItems: "center", justifyContent: "center", gap: 6 },
  pullText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  note: { fontSize: 10, color: colors.muted },
  error: { fontSize: 12, color: colors.coral },
});
