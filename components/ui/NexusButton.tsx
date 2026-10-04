import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { NexusIcon } from "@/components/ui/NexusIcon";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function NexusButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  compact = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: Props) {
  const { colors, visuals } = useNexus();
  const [focused, setFocused] = useState(false);
  const background =
    variant === "primary" ? colors.primary : variant === "danger" ? `${colors.danger}1A` : variant === "secondary" ? colors.surfaceAlt : "transparent";
  const borderColor = variant === "secondary" ? colors.borderStrong : variant === "danger" ? `${colors.danger}55` : "transparent";
  const textColor = variant === "primary" ? colors.onPrimary : variant === "danger" ? colors.danger : variant === "ghost" ? colors.primarySoft : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      hitSlop={compact ? 4 : 0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.normal,
        fullWidth && styles.fullWidth,
        { backgroundColor: background, borderColor, borderRadius: compact ? Math.max(8, visuals.buttonRadius - 2) : visuals.buttonRadius, opacity: disabled ? 0.42 : pressed ? 0.8 : 1 },
        pressed && !disabled && styles.pressed,
        focused && { borderColor: colors.primarySoft, borderWidth: 2 },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={textColor} /> : icon === "▶" ? <NexusIcon name="play" color={textColor} size={compact ? 14 : 16} /> : icon ? <NexusText color={textColor}>{icon}</NexusText> : null}
        <NexusText variant="subtitle" color={textColor} style={[styles.label, compact && styles.compactLabel]}>
          {label}
        </NexusText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  normal: { paddingHorizontal: 18, paddingVertical: 12 },
  compact: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6 },
  pressed: { transform: [{ scale: 0.985 }] },
  fullWidth: { width: "100%" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { textAlign: "center", flexShrink: 1 },
  compactLabel: { fontSize: 14, lineHeight: 18 },
});
