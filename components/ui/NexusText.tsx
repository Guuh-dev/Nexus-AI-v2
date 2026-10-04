import type { PropsWithChildren } from "react";
import { Platform, Text, type TextProps, type TextStyle } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

type Variant = "display" | "title" | "subtitle" | "body" | "caption" | "mono" | "eyebrow" | "metric";

const sans = Platform.OS === "web"
  ? "Inter, \"SF Pro Text\", system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
  : undefined;

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  // Small section label. Monospace only survives in the terminal-style theme.
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  mono: { fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  metric: { fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
};

type Props = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    secondary?: boolean;
    color?: string;
  }
>;

export function NexusText({ variant = "body", secondary = false, color, style, children, ...props }: Props) {
  const { colors, visuals } = useNexus();
  const terminal = visuals.cardStyle === "terminal" && (variant === "mono" || variant === "eyebrow");
  return (
    <Text
      {...props}
      style={[
        variants[variant],
        { color: color ?? (secondary ? colors.textSecondary : colors.text) },
        terminal ? { fontFamily: "monospace", letterSpacing: 1.2 } : sans ? { fontFamily: sans } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
