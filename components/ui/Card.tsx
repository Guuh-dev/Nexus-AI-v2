import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

type Props = PropsWithChildren<ViewProps & { elevated?: boolean }>;

export function Card({ children, elevated = false, style, ...props }: Props) {
  const { colors } = useNexus();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: elevated ? colors.surfaceRaised : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 22,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
