import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

type Props = PropsWithChildren<ViewProps & { elevated?: boolean }>;

export function Card({ children, elevated = false, style, ...props }: Props) {
  const { colors, visuals } = useNexus();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: elevated ? colors.surfaceRaised : colors.surface,
          borderColor: colors.border,
          borderWidth: visuals.borderWidth,
          borderRadius: visuals.cardRadius,
          padding: 16,
          shadowColor: colors.primary,
          shadowOpacity: visuals.shadowOpacity,
          shadowRadius: visuals.shadowRadius,
          shadowOffset: { width: 0, height: 8 },
          elevation: visuals.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
