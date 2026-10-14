import { useThemedStyles, type Palette } from "./ui";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { themedStyles } from "./ui";
import { type CleanupFilter } from "./cleanup";

export default function CleanupTools({ selected, onSelect, counts, savings, unknown, paged }: {
  selected: CleanupFilter; onSelect: (filter: CleanupFilter) => void;
  counts: Record<CleanupFilter, number>; savings: string; unknown: number; paged: boolean;
}) {
  const s = useThemedStyles(createStyles);
  return <View style={s.tools}>
    <View style={s.filters}>
      {([
        ["all", "All"], ["screenshots", "Screenshots"], ["large", "Large photos"],
      ] as const).map(([value, label]) => <Pressable key={value}
        accessibilityRole="tab" accessibilityLabel={`${label}, ${counts[value]} photos`}
        accessibilityState={{ selected: value === selected }}
        hitSlop={{ top: 6, bottom: 6 }}
        onPress={() => onSelect(value)} style={[s.chip, value === selected && s.active]}>
        <Text numberOfLines={1} style={[s.label, value === selected && s.activeLabel]}>
          {label}
        </Text>
        <Text numberOfLines={1} style={[s.count, value === selected && s.activeLabel]}>{counts[value]}</Text>
      </Pressable>)}
    </View>
    <View style={s.summary}>
      <Text style={s.note}>{selected === "large" ? "Remaining · 1 MB+" : paged ? "Remaining · loaded photos" : "Remaining to review"}
        {unknown > 0 ? ` · ${unknown} sizes unknown` : ""}</Text>
      <Text style={s.savings}>{savings} queued</Text>
    </View>
  </View>;
}
const createStyles = (colors: Palette) => themedStyles({
  tools: { marginBottom: 8, gap: 6 },
  filters: { flexDirection: "row", gap: 6 },
  chip: { flex: 1, minHeight: 32, flexDirection: "row", gap: 4, paddingHorizontal: 6,
    justifyContent: "center", alignItems: "center",
    borderRadius: 16, backgroundColor: colors.control, borderWidth: 1, borderColor: colors.line },
  active: { backgroundColor: colors.activeControl, borderColor: "rgba(36,107,196,0.4)" },
  label: { fontSize: 10, color: colors.ink, fontWeight: "500", flexShrink: 1 },
  count: { fontSize: 10, color: colors.muted, fontWeight: "600", flexShrink: 0 },
  activeLabel: { color: colors.accent, fontWeight: "700" },
  summary: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  note: { fontSize: 11, lineHeight: 16, color: colors.ambientMuted, flex: 1 },
  savings: { fontSize: 12, lineHeight: 16, color: colors.ambientInk, fontWeight: "700" },
});
