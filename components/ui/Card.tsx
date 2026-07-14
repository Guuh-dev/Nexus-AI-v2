import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

export function Card({
  children,
  elevated = false,
  style,
  ...props
}: PropsWithChildren<ViewProps & { elevated?: boolean }>) {
  const { colors, visuals } = useNexus();
  const glass = visuals.cardStyle === "glass";
  const terminal = visuals.cardStyle === "terminal";
  const minimal = visuals.cardStyle === "minimal";
  const sharp = visuals.cardStyle === "sharp";

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: minimal
            ? colors.background
            : glass
              ? `${elevated ? colors.surfaceRaised : colors.surface}D9`
              : elevated
                ? colors.surfaceRaised
                : colors.surface,
          borderColor: terminal
            ? colors.primary
            : glass
              ? `${colors.primary}55`
              : colors.border,
          borderWidth: minimal
            ? 0
            : terminal
              ? Math.max(1, visuals.borderWidth)
              : visuals.borderWidth,
          borderRadius:
            sharp || terminal
              ? Math.min(visuals.cardRadius, 10)
              : visuals.cardRadius,
          padding: 14,
          shadowColor: terminal ? colors.glow : colors.shadow,
          shadowOpacity: minimal ? 0 : visuals.shadowOpacity,
          shadowRadius: terminal
            ? Math.min(10, visuals.shadowRadius)
            : visuals.shadowRadius,
          shadowOffset: { width: 0, height: glass ? 12 : 8 },
          elevation: minimal ? 0 : visuals.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
