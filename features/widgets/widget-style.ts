import type { NexusColors } from "@/theme/theme";
import type { WidgetStyle } from "@/types";

export type WidgetStyleTokens = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  accent: string;
  shadowOpacity: number;
  shadowRadius: number;
  decoration:
    | "none"
    | "glass"
    | "pixel"
    | "hud"
    | "neon"
    | "mascot"
    | "privacy";
  radius?: number;
};

export function getWidgetStyleTokens(
  style: WidgetStyle,
  colors: NexusColors,
  requestedAccent: string,
): WidgetStyleTokens {
  switch (style) {
    case "amoled":
      return {
        backgroundColor: "#000000",
        borderColor: "#1B1B1B",
        borderWidth: 1,
        accent: requestedAccent,
        shadowOpacity: 0,
        shadowRadius: 0,
        decoration: "none",
        radius: 10,
      };
    case "transparent":
      return {
        backgroundColor: `${colors.surfaceAlt}55`,
        borderColor: `${requestedAccent}55`,
        borderWidth: 1,
        accent: requestedAccent,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        decoration: "glass",
        radius: 22,
      };
    case "glass":
      return {
        backgroundColor: `${requestedAccent}20`,
        borderColor: `${requestedAccent}88`,
        borderWidth: 1,
        accent: "#E8DDFF",
        shadowOpacity: 0.26,
        shadowRadius: 20,
        decoration: "glass",
        radius: 26,
      };
    case "pixel":
      return {
        backgroundColor: "#111016",
        borderColor: requestedAccent,
        borderWidth: 3,
        accent: requestedAccent,
        shadowOpacity: 0.12,
        shadowRadius: 0,
        decoration: "pixel",
        radius: 2,
      };
    case "minimal":
      return {
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 0,
        accent: colors.text,
        shadowOpacity: 0,
        shadowRadius: 0,
        decoration: "none",
        radius: 8,
      };
    case "gamer":
      return {
        backgroundColor: "#03100D",
        borderColor: "#36F5A7",
        borderWidth: 2,
        accent: "#36F5A7",
        shadowOpacity: 0.24,
        shadowRadius: 12,
        decoration: "hud",
        radius: 5,
      };
    case "neon":
      return {
        backgroundColor: "#05020C",
        borderColor: "#F04CFF",
        borderWidth: 2,
        accent: "#52E8FF",
        shadowOpacity: 0.52,
        shadowRadius: 24,
        decoration: "neon",
        radius: 18,
      };
    case "mascot":
      return {
        backgroundColor: `${requestedAccent}26`,
        borderColor: `${requestedAccent}99`,
        borderWidth: 2,
        accent: requestedAccent,
        shadowOpacity: 0.3,
        shadowRadius: 18,
        decoration: "mascot",
        radius: 28,
      };
    case "privacy":
      return {
        backgroundColor: "#111116",
        borderColor: "#4A4655",
        borderWidth: 1,
        accent: "#A7A1B5",
        shadowOpacity: 0,
        shadowRadius: 0,
        decoration: "privacy",
        radius: 16,
      };
    default:
      return {
        backgroundColor: colors.surfaceAlt,
        borderColor: `${requestedAccent}70`,
        borderWidth: 1,
        accent: requestedAccent,
        shadowOpacity: 0.22,
        shadowRadius: 16,
        decoration: "none",
        radius: 20,
      };
  }
}
