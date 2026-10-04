import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

type Tone = "default" | "accent" | "warning" | "danger" | "success";

export function Card({
  children,
  elevated = false,
  tone = "default",
  style,
  ...props
}: PropsWithChildren<ViewProps & { elevated?: boolean; tone?: Tone }>) {
  const { colors, visuals } = useNexus();
  const glass = visuals.cardStyle === "glass";
  const terminal = visuals.cardStyle === "terminal";
  const minimal = visuals.cardStyle === "minimal";
  const sharp = visuals.cardStyle === "sharp";
  const toneColor = tone === "accent" ? colors.primary : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : tone === "success" ? colors.success : undefined;
  const base = elevated ? colors.surfaceAlt : colors.surface;

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: glass ? `${base}D9` : minimal && !elevated ? colors.surface : base,
          borderColor: toneColor ? `${toneColor}55` : terminal ? `${colors.primary}66` : glass ? `${colors.primary}40` : colors.border,
          borderWidth: visuals.borderWidth,
          borderRadius: sharp || terminal ? Math.min(visuals.cardRadius, 10) : visuals.cardRadius,
          padding: 16,
          shadowColor: colors.shadow,
          shadowOpacity: visuals.shadowOpacity,
          shadowRadius: visuals.shadowRadius,
          shadowOffset: { width: 0, height: 6 },
          elevation: visuals.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
