import type { Preferences, ThemeId } from "@/types";
import { normalizeHexColor } from "@/utils/text";

export type NexusColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  primary: string;
  primarySoft: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  borderStrong: string;
  overlay: string;
  tabBar: string;
};

export type NexusVisuals = {
  cardRadius: number;
  buttonRadius: number;
  chipRadius: number;
  borderWidth: number;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  backdrop: "none" | "grid" | "aurora" | "stars" | "scanlines" | "glow";
  cardStyle: "soft" | "sharp" | "glass" | "terminal" | "minimal";
  tabActiveFill: string;
};

const base = {
  text: "#F7F7F8",
  textSecondary: "#A1A1AA",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#FB7185",
};

const palettes: Record<Exclude<ThemeId, "custom">, NexusColors> = {
  nexus: { ...base, background: "#050505", surface: "#111114", surfaceAlt: "#19191F", surfaceRaised: "#202028", primary: "#8B5CF6", primarySoft: "#C4B5FD", border: "#282632", borderStrong: "#554675", overlay: "rgba(0,0,0,0.76)", tabBar: "#0A090D" },
  amoled: { ...base, background: "#000000", surface: "#050505", surfaceAlt: "#0A0A0A", surfaceRaised: "#101010", primary: "#B89CFF", primarySoft: "#E1D7FF", border: "#151515", borderStrong: "#2B2B2B", overlay: "rgba(0,0,0,0.92)", tabBar: "#000000" },
  oneui: { ...base, background: "#0B1020", surface: "#161D31", surfaceAlt: "#202A43", surfaceRaised: "#2A3654", primary: "#6EA8FF", primarySoft: "#C0D8FF", border: "#33415F", borderStrong: "#5874A7", overlay: "rgba(5,8,18,0.80)", tabBar: "#11182A" },
  hud: { ...base, background: "#020806", surface: "#07130F", surfaceAlt: "#0B2119", surfaceRaised: "#103126", primary: "#32F5A5", primarySoft: "#9BFFD8", border: "#124A36", borderStrong: "#1C7653", overlay: "rgba(0,7,4,0.88)", tabBar: "#030E0A" },
  aurora: { ...base, background: "#070914", surface: "#11182B", surfaceAlt: "#182642", surfaceRaised: "#213355", primary: "#24D7E8", primarySoft: "#C49CFF", border: "#29456C", borderStrong: "#4B72A4", overlay: "rgba(3,5,18,0.84)", tabBar: "#0A1020" },
  ocean: { ...base, background: "#01070D", surface: "#061725", surfaceAlt: "#0A2940", surfaceRaised: "#103B59", primary: "#24B5FF", primarySoft: "#9DDEFF", border: "#164B67", borderStrong: "#26779A", overlay: "rgba(0,5,12,0.88)", tabBar: "#03111C" },
  ember: { ...base, background: "#0B0300", surface: "#1A0B06", surfaceAlt: "#2C120A", surfaceRaised: "#421C0E", primary: "#FF6B1A", primarySoft: "#FFD09A", border: "#5A2613", borderStrong: "#93421F", overlay: "rgba(10,2,0,0.88)", tabBar: "#130603" },
  rose: { ...base, background: "#0C0209", surface: "#1C0B18", surfaceAlt: "#321226", surfaceRaised: "#48203A", primary: "#FF4FA0", primarySoft: "#FFD0E7", border: "#5C284A", borderStrong: "#98436F", overlay: "rgba(10,1,7,0.88)", tabBar: "#160611" },
  monochrome: { ...base, background: "#070707", surface: "#111111", surfaceAlt: "#1C1C1C", surfaceRaised: "#292929", primary: "#F4F4F5", primarySoft: "#FFFFFF", border: "#333333", borderStrong: "#696969", overlay: "rgba(0,0,0,0.90)", tabBar: "#0A0A0A" },
  light: { background: "#F3F5FA", surface: "#FFFFFF", surfaceAlt: "#EEF1F8", surfaceRaised: "#E5EAF5", primary: "#6D3BEF", primarySoft: "#5730C2", text: "#15131B", textSecondary: "#625D70", success: "#168B4B", warning: "#B86E00", danger: "#D4355A", border: "#D9DEEA", borderStrong: "#B8C1D5", overlay: "rgba(21,19,27,0.44)", tabBar: "#FBFCFF" },
};

const visuals: Record<Exclude<ThemeId, "custom">, NexusVisuals> = {
  nexus: { cardRadius: 22, buttonRadius: 16, chipRadius: 999, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 18, elevation: 5, backdrop: "glow", cardStyle: "soft", tabActiveFill: "22" },
  amoled: { cardRadius: 12, buttonRadius: 12, chipRadius: 999, borderWidth: 1, shadowOpacity: 0, shadowRadius: 0, elevation: 0, backdrop: "none", cardStyle: "minimal", tabActiveFill: "18" },
  oneui: { cardRadius: 30, buttonRadius: 22, chipRadius: 999, borderWidth: 0, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8, backdrop: "glow", cardStyle: "soft", tabActiveFill: "28" },
  hud: { cardRadius: 4, buttonRadius: 4, chipRadius: 4, borderWidth: 1, shadowOpacity: 0.16, shadowRadius: 8, elevation: 1, backdrop: "grid", cardStyle: "terminal", tabActiveFill: "20" },
  aurora: { cardRadius: 24, buttonRadius: 18, chipRadius: 16, borderWidth: 1, shadowOpacity: 0.28, shadowRadius: 26, elevation: 6, backdrop: "aurora", cardStyle: "glass", tabActiveFill: "24" },
  ocean: { cardRadius: 28, buttonRadius: 20, chipRadius: 999, borderWidth: 1, shadowOpacity: 0.25, shadowRadius: 22, elevation: 5, backdrop: "stars", cardStyle: "glass", tabActiveFill: "22" },
  ember: { cardRadius: 10, buttonRadius: 8, chipRadius: 8, borderWidth: 1, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4, backdrop: "scanlines", cardStyle: "sharp", tabActiveFill: "24" },
  rose: { cardRadius: 26, buttonRadius: 24, chipRadius: 999, borderWidth: 1, shadowOpacity: 0.3, shadowRadius: 24, elevation: 6, backdrop: "aurora", cardStyle: "glass", tabActiveFill: "24" },
  monochrome: { cardRadius: 0, buttonRadius: 2, chipRadius: 2, borderWidth: 1, shadowOpacity: 0, shadowRadius: 0, elevation: 0, backdrop: "scanlines", cardStyle: "minimal", tabActiveFill: "16" },
  light: { cardRadius: 26, buttonRadius: 18, chipRadius: 999, borderWidth: 1, shadowOpacity: 0.12, shadowRadius: 18, elevation: 3, backdrop: "glow", cardStyle: "soft", tabActiveFill: "18" },
};

export function getColors(preferences: Preferences): NexusColors {
  if (preferences.theme !== "custom") return palettes[preferences.theme];
  const primary = normalizeHexColor(preferences.customAccent);
  return { ...palettes.nexus, primary, primarySoft: primary };
}

export function getVisuals(preferences: Preferences): NexusVisuals {
  return preferences.theme === "custom" ? visuals.nexus : visuals[preferences.theme];
}

export const radii = { small: 10, medium: 16, large: 22, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
