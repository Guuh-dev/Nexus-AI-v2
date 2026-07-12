import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
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
    variant === "primary" ? colors.primary : variant === "danger" ? `${colors.danger}22` : variant === "secondary" ? colors.surfaceAlt : "transparent";
  const borderColor = variant === "danger" ? `${colors.danger}66` : variant === "ghost" ? colors.border : variant === "secondary" ? colors.borderStrong : background;
  const textColor = variant === "primary" ? "#FFFFFF" : variant === "danger" ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.normal,
        fullWidth && styles.fullWidth,
        { backgroundColor: background, borderColor, borderRadius: compact ? Math.max(8, visuals.buttonRadius - 3) : visuals.buttonRadius, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
        focused && { borderColor: colors.primarySoft, borderWidth: 2 },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={textColor} /> : icon ? <NexusText color={textColor}>{icon}</NexusText> : null}
        <NexusText variant="subtitle" color={textColor} numberOfLines={1}>
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
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  normal: { paddingHorizontal: 18, paddingVertical: 12 },
  compact: { minHeight: 42, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13 },
  fullWidth: { width: "100%" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
