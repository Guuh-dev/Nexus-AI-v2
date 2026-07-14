import type { NexusColors } from "@/theme/theme";
import type { WidgetStyle } from "@/types";

export const WIDGET_VISUAL_STYLES = ["nexus", "amoled", "transparent", "pixel", "minimal"] as const;
export type WidgetVisualStyle = (typeof WIDGET_VISUAL_STYLES)[number];

export type WidgetStyleTokens = {
  style: WidgetVisualStyle;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  accent: string;
  textColor: string;
  secondaryTextColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  decoration: "none" | "pixel";
  radius: number;
};

export function normalizeWidgetStyle(style: WidgetStyle | string): WidgetVisualStyle {
  if (WIDGET_VISUAL_STYLES.includes(style as WidgetVisualStyle)) return style as WidgetVisualStyle;
  if (style === "gamer") return "pixel";
  if (style === "privacy" || style === "light") return "minimal";
  return "nexus";
}

export function getWidgetStyleTokens(
  requestedStyle: WidgetStyle | WidgetVisualStyle,
  _colors: NexusColors,
  requestedAccent: string,
  opacityPercent = 96,
): WidgetStyleTokens {
  const style = normalizeWidgetStyle(requestedStyle);
  const backgroundAlpha = Math.max(0, Math.min(255, Math.round(opacityPercent / 100 * 255)));
  const alpha = backgroundAlpha.toString(16).padStart(2, "0").toUpperCase();
  switch (style) {
    case "amoled":
      return {
        style,
        backgroundColor: `#000000${alpha}`,
        borderColor: "#3F3F4A40",
        borderWidth: 1,
        accent: requestedAccent,
        textColor: "#F7F7F8",
        secondaryTextColor: "#A1A1AA",
        shadowOpacity: 0,
        shadowRadius: 0,
        decoration: "none",
        radius: 22,
      };
    case "transparent":
      return {
        style,
        backgroundColor: "#00000000",
        borderColor: "transparent",
        borderWidth: 0,
        accent: requestedAccent,
        textColor: "#F7F7F8",
        secondaryTextColor: "#A1A1AA",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        decoration: "none",
        radius: 0,
      };
    case "pixel":
      return {
        style,
        backgroundColor: `#111114${alpha}`,
        borderColor: "#8B5CF6",
        borderWidth: 2,
        accent: requestedAccent,
        textColor: "#F7F7F8",
        secondaryTextColor: "#A1A1AA",
        shadowOpacity: 0.12,
        shadowRadius: 0,
        decoration: "pixel",
        radius: 6,
      };
    case "minimal":
      return {
        style,
        backgroundColor: `#101012${alpha}`,
        borderColor: "#3A3A4233",
        borderWidth: 1,
        accent: requestedAccent,
        textColor: "#F7F7F8",
        secondaryTextColor: "#A1A1AA",
        shadowOpacity: 0,
        shadowRadius: 0,
        decoration: "none",
        radius: 24,
      };
    default:
      return {
        style: "nexus",
        backgroundColor: `#111114${alpha}`,
        borderColor: nexusBorderForOpacity(opacityPercent),
        borderWidth: 1,
        accent: requestedAccent,
        textColor: "#F7F7F8",
        secondaryTextColor: "#A1A1AA",
        shadowOpacity: 0.22,
        shadowRadius: 16,
        decoration: "none",
        radius: 20,
      };
  }
}

function nexusBorderForOpacity(opacityPercent: number): string {
  if (opacityPercent <= 50) return "#8B5CF666";
  if (opacityPercent <= 70) return "#8B5CF673";
  if (opacityPercent <= 85) return "#8B5CF680";
  if (opacityPercent <= 96) return "#8B5CF68C";
  return "#8B5CF64D";
}
