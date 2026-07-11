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

const base = {
  text: "#F7F7F8",
  textSecondary: "#A1A1AA",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#FB7185",
};

const palettes: Record<Exclude<ThemeId, "custom">, NexusColors> = {
  nexus: {
    ...base,
    background: "#050505",
    surface: "#111114",
    surfaceAlt: "#19191F",
    surfaceRaised: "#202028",
    primary: "#8B5CF6",
    primarySoft: "#A78BFA",
    border: "#27272F",
    borderStrong: "#3F3F4A",
    overlay: "rgba(0,0,0,0.74)",
    tabBar: "#0B0B0E",
  },
  amoled: {
    ...base,
    background: "#000000",
    surface: "#080808",
    surfaceAlt: "#101012",
    surfaceRaised: "#17171A",
    primary: "#9B7BFF",
    primarySoft: "#C4B5FD",
    border: "#1D1D22",
    borderStrong: "#34343B",
    overlay: "rgba(0,0,0,0.84)",
    tabBar: "#030303",
  },
  oneui: {
    ...base,
    background: "#080A10",
    surface: "#141823",
    surfaceAlt: "#1D2330",
    surfaceRaised: "#252C3A",
    primary: "#7C9CFF",
    primarySoft: "#AFC2FF",
    border: "#2C3445",
    borderStrong: "#465169",
    overlay: "rgba(3,5,10,0.78)",
    tabBar: "#0E121B",
  },
  hud: {
    ...base,
    background: "#030807",
    surface: "#0B1412",
    surfaceAlt: "#101D19",
    surfaceRaised: "#162721",
    primary: "#2DD4A8",
    primarySoft: "#6EE7C7",
    border: "#1C3931",
    borderStrong: "#2A5C4D",
    overlay: "rgba(0,5,4,0.82)",
    tabBar: "#07100E",
  },
  aurora: {
    ...base,
    background: "#05070C",
    surface: "#0E1320",
    surfaceAlt: "#161D2C",
    surfaceRaised: "#1D2738",
    primary: "#22D3EE",
    primarySoft: "#A78BFA",
    border: "#233047",
    borderStrong: "#38506F",
    overlay: "rgba(2,5,12,0.82)",
    tabBar: "#090D16",
  },
  ocean: {
    ...base,
    background: "#02070B",
    surface: "#07141D",
    surfaceAlt: "#0D202C",
    surfaceRaised: "#143040",
    primary: "#38BDF8",
    primarySoft: "#7DD3FC",
    border: "#173748",
    borderStrong: "#24566D",
    overlay: "rgba(0,5,10,0.84)",
    tabBar: "#041019",
  },
  ember: {
    ...base,
    background: "#090503",
    surface: "#17100D",
    surfaceAlt: "#241713",
    surfaceRaised: "#32201A",
    primary: "#F97316",
    primarySoft: "#FDBA74",
    border: "#3A251D",
    borderStrong: "#60402F",
    overlay: "rgba(8,3,1,0.84)",
    tabBar: "#100906",
  },
  rose: {
    ...base,
    background: "#080407",
    surface: "#170E16",
    surfaceAlt: "#251522",
    surfaceRaised: "#34202F",
    primary: "#EC4899",
    primarySoft: "#F9A8D4",
    border: "#3B2235",
    borderStrong: "#60405A",
    overlay: "rgba(7,2,6,0.84)",
    tabBar: "#100810",
  },
  monochrome: {
    ...base,
    background: "#050505",
    surface: "#101010",
    surfaceAlt: "#1A1A1A",
    surfaceRaised: "#242424",
    primary: "#E4E4E7",
    primarySoft: "#FAFAFA",
    border: "#292929",
    borderStrong: "#444444",
    overlay: "rgba(0,0,0,0.86)",
    tabBar: "#090909",
  },
};

export function getColors(preferences: Preferences): NexusColors {
  if (preferences.theme !== "custom") return palettes[preferences.theme];
  const primary = normalizeHexColor(preferences.customAccent);
  return { ...palettes.nexus, primary, primarySoft: primary };
}

export const radii = { small: 10, medium: 16, large: 22, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
