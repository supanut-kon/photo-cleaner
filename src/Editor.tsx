import { useTheme, useThemedStyles, type Palette } from "./ui";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import {
  Canvas,
  ColorMatrix,
  Image,
  ImageFormat,
  Skia,
  rect,
  useImage,
} from "@shopify/react-native-skia";
import { Asset } from "expo-asset";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import {
  Button,
  Backdrop,
  Glass,
  glassShadow,
  themedStyles,
  fonts,
  Icon,
  IconButton,
  Pill,
} from "./ui";
import { type Photo } from "./photos";
import { type Edit } from "./session";
import { saveCopyToPhotos, resolvePhoto } from "./phoneLibrary";

export function adjustmentMatrix(
  brightness: number,
  contrast: number,
  saturation: number,
  warmth: number,
) {
  const c = 1 + contrast / 100,
    s = 1 + saturation / 100;
  const r = 0.2126 * (1 - s),
    g = 0.7152 * (1 - s),
    b = 0.0722 * (1 - s);
  const offset = brightness / 100 + 0.5 * (1 - c);
  return [
    c * (r + s),
    c * g,
    c * b,
    0,
    offset + warmth / 500,
    c * r,
    c * (g + s),
    c * b,
    0,
    offset,
    c * r,
    c * g,
    c * (b + s),
    0,
    offset - warmth / 500,
    0,
    0,
    0,
    1,
    0,
  ];
}
const presets = [
  { name: "Original", b: 0, c: 0, s: 0, w: 0, tint: "#E9E7E0" },
  { name: "Soft", b: 5, c: -12, s: -10, w: 5, tint: "#DDDCCA" },
  { name: "Warm", b: 3, c: 6, s: 8, w: 25, tint: "#EBC1A1" },
  { name: "Vivid", b: 0, c: 15, s: 30, w: 0, tint: "#B7C8AE" },
  { name: "Mono", b: 0, c: 12, s: -100, w: 0, tint: "#B4B6B4" },
];
export default function Editor({
  photo,
  edit,
  onClose,
  onSave,
}: {
  photo: Photo;
  edit?: Edit;
  onClose: () => void;
  onSave: (edit: Edit) => void;
}) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const width = Math.min(windowWidth, 480) - 40;
  const thumbnailWidth = (width - 32) / 5 - 4;
  const thumbnailHeight = (thumbnailWidth + 4) / 0.85 - 4;
  const incomingSource =
    edit?.uri ??
    (typeof photo.source === "number" ? photo.source : photo.source.uri);
  const needsLocalFile =
    typeof incomingSource === "string" && incomingSource.startsWith("ph://");
  const [source, setSource] = useState<number | string | null>(
    needsLocalFile ? null : incomingSource,
  );
  const [originalSource, setOriginalSource] = useState<number | string | null>(
    needsLocalFile ? null : incomingSource,
  );
  const image = useImage(source);
  const [brightness, setBrightness] = useState(0),
    [contrast, setContrast] = useState(0),
    [saturation, setSaturation] = useState(0),
    [warmth, setWarmth] = useState(0);
  const [preset, setPreset] = useState("Original"),
    [before, setBefore] = useState(false),
    [busy, setBusy] = useState(needsLocalFile),
    [error, setError] = useState("");
  const [tool, setTool] = useState<"looks" | "adjust" | "crop">("looks");
  const matrix = adjustmentMatrix(brightness, contrast, saturation, warmth);
  const shownImage = useImage(before ? originalSource : source);
  // Reloading directly into the editor must not pass a Photos URI to Skia.
  useEffect(() => {
    if (!needsLocalFile) return;
    let active = true;
    void resolvePhoto(photo)
      .then((resolved) => {
        if (!active) return;
        const uri =
          typeof resolved.source === "number"
            ? resolved.source
            : resolved.source.uri;
        setSource(uri);
        setOriginalSource(uri);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to prepare this photo.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [needsLocalFile, photo]);
  const previewHeight = Math.min(Math.max(windowHeight * 0.4, 230), 380);
  async function getUri() {
    if (source === null) throw new Error("This photo is still loading.");
    if (typeof source === "string") return source;
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return asset.localUri ?? asset.uri;
  }
  async function geometry(action: "rotate" | "square" | "portrait") {
    if (!image || busy) return;
    setBusy(true);
    setError("");
    try {
      const context = ImageManipulator.manipulate(await getUri());
      if (action === "rotate") context.rotate(90);
      else {
        const ratio = action === "square" ? 1 : 4 / 5;
        const cropWidth = Math.floor(
          Math.min(image.width(), image.height() * ratio),
        );
        const cropHeight = Math.floor(cropWidth / ratio);
        context.crop({
          originX: Math.floor((image.width() - cropWidth) / 2),
          originY: Math.floor((image.height() - cropHeight) / 2),
          width: cropWidth,
          height: cropHeight,
        });
      }
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 1,
      });
      setSource(saved.uri);
    } catch {
      setError("This change could not be applied. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!image || busy) return;
    setBusy(true);
    setError("");
    let surface: ReturnType<typeof Skia.Surface.MakeOffscreen> = null;
    try {
      // Cap prototype exports to control memory on older phones.
      const scale = Math.min(1, 2048 / Math.max(image.width(), image.height()));
      const w = Math.round(image.width() * scale),
        h = Math.round(image.height() * scale);
      surface = Skia.Surface.MakeOffscreen(w, h);
      if (!surface) throw new Error("Unable to create an image surface");
      const paint = Skia.Paint();
      paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
      surface
        .getCanvas()
        .drawImageRect(
          image,
          rect(0, 0, image.width(), image.height()),
          rect(0, 0, w, h),
          paint,
        );
      surface.flush();
      const snapshot = surface.makeImageSnapshot();
      let uri: string;
      if (Platform.OS === "web")
        uri = `data:image/jpeg;base64,${snapshot.encodeToBase64(ImageFormat.JPEG, 92)}`;
      else {
        const file = new File(
          Paths.document,
          `keep-${photo.id}-${Date.now()}.jpg`,
        );
        file.create();
        file.write(snapshot.encodeToBytes(ImageFormat.JPEG, 92));
        uri = file.uri;
      }
      snapshot.dispose();
      paint.dispose();
      let savedEdit: Edit = {
        uri,
        width: w,
        height: h,
        savedAt: new Date().toISOString(),
        filename: `keep-${photo.filename.replace(/\.[^.]+$/, "")}.jpg`,
      };
      if (Platform.OS !== "web") savedEdit = await saveCopyToPhotos(savedEdit);
      onSave(savedEdit);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The copy could not be saved. Your original is still safe.",
      );
    } finally {
      surface?.dispose();
      setBusy(false);
    }
  }
  function reset() {
    setSource(originalSource);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setPreset("Original");
    setError("");
  }
  return (
    <SafeAreaView style={s.safe}>
      <Backdrop />
      <View style={s.header}>
        <Glass intensity={25} />
        <IconButton icon="close" label="Cancel editing" onPress={onClose} />
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={s.title}>A little fine-tuning</Text>
          <Text style={s.sub}>Make a good photo yours.</Text>
        </View>
        <IconButton
          icon="refresh-outline"
          label="Reset changes"
          onPress={reset}
        />
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.preview, { width, height: previewHeight }]}>
          {shownImage ? (
            <Canvas style={{ width, height: previewHeight }}>
              <Image
                image={shownImage}
                x={0}
                y={0}
                width={width}
                height={previewHeight}
                fit="contain"
              >
                {!before && <ColorMatrix matrix={matrix} />}
              </Image>
            </Canvas>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold to compare with before"
            onPressIn={() => setBefore(true)}
            onPressOut={() => setBefore(false)}
            style={s.compare}
          >
            <Glass intensity={25} />
            <Icon name="layers-outline" color={colors.ink} size={15} />
            <Text style={s.compareText}>
              {before ? "Before" : "Hold for before"}
            </Text>
          </Pressable>
          {busy && (
            <View style={s.busy}>
              <ActivityIndicator color="white" />
            </View>
          )}
        </View>
        <View style={s.copyNote}>
          <Icon
            name="shield-checkmark-outline"
            size={15}
            color={colors.accent}
          />
          <Text style={s.note}>Your original stays untouched</Text>
          <Pill text="NEW COPY" />
        </View>
        <View style={s.tabs}>
        <Glass intensity={25} />
          {(["looks", "adjust", "crop"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tool === value }}
              onPress={() => setTool(value)}
              style={[s.tab, tool === value && s.tabActive]}
            >
              <Text
                style={[s.tabText, tool === value && { color: colors.accent }]}
              >
                {value === "looks"
                  ? "Looks"
                  : value === "adjust"
                    ? "Adjust"
                    : "Crop & rotate"}
              </Text>
            </Pressable>
          ))}
        </View>
        {tool === "looks" && (
          <View style={s.presets}>
            {presets.map((p) => (
              <Pressable
                key={p.name}
                accessibilityRole="button"
                accessibilityLabel={`${p.name} filter`}
                accessibilityState={{ selected: preset === p.name }}
                onPress={() => {
                  setBrightness(p.b);
                  setContrast(p.c);
                  setSaturation(p.s);
                  setWarmth(p.w);
                  setPreset(p.name);
                }}
                style={s.preset}
              >
                <View
                  style={[
                    s.swatch,
                    { backgroundColor: p.tint },
                    preset === p.name && s.swatchActive,
                  ]}
                >
                  {image && (
                    <Canvas
                      style={{ width: thumbnailWidth, height: thumbnailHeight }}
                    >
                      <Image
                        image={image}
                        x={0}
                        y={0}
                        width={thumbnailWidth}
                        height={thumbnailHeight}
                        fit="cover"
                      >
                        <ColorMatrix
                          matrix={adjustmentMatrix(p.b, p.c, p.s, p.w)}
                        />
                      </Image>
                    </Canvas>
                  )}
                  {preset === p.name && (
                    <View style={s.swatchCheck}>
                      <Icon name="checkmark" color="white" size={16} />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    s.presetText,
                    preset === p.name && {
                      color: colors.accent,
                      fontFamily: fonts.bold,
                      fontWeight: "normal",
                    },
                  ]}
                >
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {tool === "adjust" && (
          <View style={s.sliders}>
            {[
              { label: "Brightness", value: brightness, set: setBrightness },
              { label: "Contrast", value: contrast, set: setContrast },
              { label: "Saturation", value: saturation, set: setSaturation },
              { label: "Warmth", value: warmth, set: setWarmth },
            ].map((item) => (
              <View key={item.label}>
                <View style={s.sliderLabel}>
                  <Text style={s.adjustLabel}>{item.label}</Text>
                  <Text style={s.note}>{Math.round(item.value)}</Text>
                </View>
                <Slider
                  accessibilityLabel={item.label}
                  minimumValue={item.label === "Saturation" ? -100 : -50}
                  maximumValue={50}
                  value={item.value}
                  onValueChange={(value) => {
                    item.set(value);
                    setPreset("Custom");
                  }}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.line}
                  thumbTintColor={colors.accent}
                />
              </View>
            ))}
          </View>
        )}
        {tool === "crop" && (
          <View style={s.cropTools}>
            <Button
              label="Rotate 90°"
              icon="refresh-outline"
              secondary
              disabled={busy || !image}
              onPress={() => geometry("rotate")}
            />
            <Button
              label="Square"
              icon="square-outline"
              secondary
              disabled={busy || !image}
              onPress={() => geometry("square")}
            />
            <Button
              label="4:5"
              icon="crop-outline"
              secondary
              disabled={busy || !image}
              onPress={() => geometry("portrait")}
            />
            <Text style={s.cropNote}>
              Crops are centered. Reset restores this editing session.
            </Text>
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
      </ScrollView>
      <View style={s.footer}>
        <Glass intensity={25} />
        <Text style={s.exportNote}>JPEG copy · up to 2048 px</Text>
        <Button
          label={busy ? "Working…" : "Save edited copy"}
          icon="checkmark-outline"
          onPress={save}
          disabled={busy || !image}
        />
      </View>
    </SafeAreaView>
  );
}
const createStyles = (colors: Palette) => themedStyles({
  safe: {
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
    marginBottom: 18,
    backgroundColor: colors.yellow,
    paddingVertical: 16,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 12, color: colors.ink },
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 },
  preview: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.lavender,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glassShadow,
  },
  compare: {
    overflow: "hidden",
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  compareText: { fontSize: 13, color: colors.ink, fontWeight: "500" },
  busy: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#00000055",
    justifyContent: "center",
  },
  copyNote: { flexDirection: "row", alignItems: "center", gap: 6 },
  note: { color: colors.ambientMuted, fontSize: 13, flex: 1 },
  tabs: {
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 3 },
  tabActive: { backgroundColor: colors.lavender },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.ink },
  presets: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  preset: { flex: 1, alignItems: "center", gap: 8 },
  swatch: {
    width: "100%",
    aspectRatio: 0.85,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  swatchActive: {
    borderColor: colors.accent,
    borderWidth: 2,
    boxShadow: glassShadow,
  },
  swatchPhoto: { width: "100%", height: "100%" },
  swatchCheck: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: colors.accent,
    borderRadius: 3,
    padding: 3,
  },
  presetText: { fontSize: 12, color: colors.ambientInk },
  sliders: { gap: 12 },
  sliderLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adjustLabel: { fontSize: 13, color: colors.ambientInk, flex: 5 },
  cropTools: { gap: 10 },
  cropNote: {
    color: colors.ambientMuted,
    fontSize: 12,
    textAlign: "center",
    paddingTop: 8,
  },
  error: { color: colors.coral, fontSize: 12 },
  footer: {
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.yellow,
  },
  exportNote: { fontSize: 12, color: colors.ink, textAlign: "center" },
});
