import type { PropsWithChildren } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

type Variant = "display" | "title" | "subtitle" | "body" | "caption" | "mono";

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: "700", letterSpacing: -0.35 },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "500", letterSpacing: 0.15 },
  mono: { fontSize: 12, lineHeight: 17, fontWeight: "700", letterSpacing: 1.25, fontFamily: "monospace" },
};

type Props = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    secondary?: boolean;
    color?: string;
  }
>;

export function NexusText({ variant = "body", secondary = false, color, style, children, ...props }: Props) {
  const { colors } = useNexus();
  return (
    <Text
      {...props}
      style={[variants[variant], { color: color ?? (secondary ? colors.textSecondary : colors.text) }, style]}
    >
      {children}
    </Text>
  );
}
