import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { NexusIcon, type NexusIconName } from "@/components/ui/NexusIcon";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

/** Page title block shared by the tabs: small context label, title, optional lead and trailing slot. */
export function ScreenHeader({ eyebrow, title, lead, trailing }: { eyebrow?: string; title: string; lead?: string; trailing?: ReactNode }) {
  const { colors } = useNexus();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <NexusText variant="eyebrow" color={colors.textSecondary}>{eyebrow}</NexusText> : null}
        <NexusText variant="display" accessibilityRole="header">{title}</NexusText>
        {lead ? <NexusText secondary>{lead}</NexusText> : null}
      </View>
      {trailing}
    </View>
  );
}

export function SectionHeader({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.headerText}>
        <NexusText variant="title" accessibilityRole="header">{title}</NexusText>
        {meta ? <NexusText variant="caption" secondary>{meta}</NexusText> : null}
      </View>
      {action}
    </View>
  );
}

export function IconButton({ icon, label, onPress }: { icon: NexusIconName; label: string; onPress: () => void }) {
  const { colors } = useNexus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <NexusIcon name={icon} color={colors.text} size={20} />
    </Pressable>
  );
}

/** Compact metric: value over label. Values come from local records, never estimates. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <NexusText variant="metric" color={tone} numberOfLines={1} adjustsFontSizeToFit>{value}</NexusText>
      <NexusText variant="caption" secondary>{label}</NexusText>
    </View>
  );
}

export function StatRow({ children }: PropsWithChildren) {
  const { colors } = useNexus();
  return <View style={[styles.statRow, { borderColor: colors.border }]}>{children}</View>;
}

export function Badge({ label, color, icon }: { label: string; color?: string; icon?: NexusIconName }) {
  const { colors } = useNexus();
  const tone = color ?? colors.primarySoft;
  return (
    <View style={[styles.badge, { backgroundColor: `${tone}1A` }]}>
      {icon ? <NexusIcon name={icon} color={tone} size={13} /> : <View style={[styles.dot, { backgroundColor: tone }]} />}
      <NexusText variant="eyebrow" color={tone}>{label}</NexusText>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const { colors } = useNexus();
  return <View style={[styles.divider, { backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingTop: 8, paddingBottom: 4 },
  headerText: { flex: 1, gap: 6 },
  section: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingTop: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 12, borderTopWidth: 1, paddingTop: 14 },
  stat: { flex: 1, gap: 2 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  divider: { height: 1, width: "100%" },
});
