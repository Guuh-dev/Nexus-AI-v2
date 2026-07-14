import type { Preferences } from "@/types";

export type CoreThemeId =
  | "nexus"
  | "amoled"
  | "glass"
  | "light"
  | "pixel"
  | "minimal";

export type NexusColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  success: string;
  onSuccess: string;
  warning: string;
  danger: string;
  border: string;
  borderStrong: string;
  overlay: string;
  tabBar: string;
  shadow: string;
  glow: string;
};

export type NexusVisuals = {
  cardRadius: number;
  buttonRadius: number;
  chipRadius: number;
  borderWidth: number;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  backdrop: "none" | "grid" | "aurora" | "glow";
  cardStyle: "soft" | "sharp" | "glass" | "terminal" | "minimal";
  tabActiveFill: string;
};

export type NexusTheme = {
  id: CoreThemeId;
  label: string;
  description: string;
  colors: NexusColors;
  visuals: NexusVisuals;
};

const darkSemantic = {
  text: "#F7F7FA",
  textSecondary: "#A7A4B3",
  success: "#4ADE80",
  onSuccess: "#07120B",
  warning: "#F6C453",
  danger: "#FB7185",
};

export const NEXUS_THEMES: Record<CoreThemeId, NexusTheme> = {
  nexus: {
    id: "nexus",
    label: "Nexus Dark",
    description: "A identidade oficial, escura e equilibrada.",
    colors: {
      ...darkSemantic,
      background: "#07070A",
      surface: "#121217",
      surfaceAlt: "#191820",
      surfaceRaised: "#211F2A",
      primary: "#8B5CF6",
      primarySoft: "#C4B5FD",
      onPrimary: "#08070D",
      border: "#2B2934",
      borderStrong: "#504667",
      overlay: "rgba(4,4,8,0.82)",
      tabBar: "#0B0A0F",
      shadow: "#000000",
      glow: "#8B5CF6",
    },
    visuals: {
      cardRadius: 18,
      buttonRadius: 14,
      chipRadius: 999,
      borderWidth: 1,
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 3,
      backdrop: "glow",
      cardStyle: "soft",
      tabActiveFill: "1F",
    },
  },
  amoled: {
    id: "amoled",
    label: "AMOLED",
    description: "Preto absoluto, contraste alto e mínimo ruído.",
    colors: {
      ...darkSemantic,
      background: "#000000",
      surface: "#050505",
      surfaceAlt: "#0A0A0C",
      surfaceRaised: "#111114",
      primary: "#A78BFA",
      primarySoft: "#DDD6FE",
      onPrimary: "#09070D",
      border: "#17171B",
      borderStrong: "#303038",
      overlay: "rgba(0,0,0,0.94)",
      tabBar: "#000000",
      shadow: "#000000",
      glow: "#A78BFA",
    },
    visuals: {
      cardRadius: 14,
      buttonRadius: 12,
      chipRadius: 999,
      borderWidth: 1,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      backdrop: "none",
      cardStyle: "minimal",
      tabActiveFill: "1A",
    },
  },
  glass: {
    id: "glass",
    label: "Glass",
    description: "Profundidade translúcida sem prometer blur nativo.",
    colors: {
      ...darkSemantic,
      background: "#090B16",
      surface: "#151929",
      surfaceAlt: "#1B2135",
      surfaceRaised: "#252D45",
      primary: "#8B7CFF",
      primarySoft: "#C9C3FF",
      onPrimary: "#080A14",
      border: "#313A54",
      borderStrong: "#596887",
      overlay: "rgba(6,8,18,0.84)",
      tabBar: "#0E1220",
      shadow: "#02030A",
      glow: "#6F8CFF",
    },
    visuals: {
      cardRadius: 22,
      buttonRadius: 16,
      chipRadius: 18,
      borderWidth: 1,
      shadowOpacity: 0.2,
      shadowRadius: 22,
      elevation: 5,
      backdrop: "aurora",
      cardStyle: "glass",
      tabActiveFill: "22",
    },
  },
  light: {
    id: "light",
    label: "Light",
    description: "Claro, sóbrio e legível em todas as telas.",
    colors: {
      background: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceAlt: "#ECEEF5",
      surfaceRaised: "#E3E6F0",
      primary: "#6842D9",
      primarySoft: "#4E2DB6",
      onPrimary: "#FFFFFF",
      text: "#18161F",
      textSecondary: "#625E6E",
      success: "#137A42",
      onSuccess: "#FFFFFF",
      warning: "#875000",
      danger: "#A62346",
      border: "#D8DAE4",
      borderStrong: "#B9BDCC",
      overlay: "rgba(24,22,31,0.46)",
      tabBar: "#FCFCFE",
      shadow: "#34303F",
      glow: "#6842D9",
    },
    visuals: {
      cardRadius: 18,
      buttonRadius: 14,
      chipRadius: 999,
      borderWidth: 1,
      shadowOpacity: 0.09,
      shadowRadius: 14,
      elevation: 2,
      backdrop: "none",
      cardStyle: "soft",
      tabActiveFill: "14",
    },
  },
  pixel: {
    id: "pixel",
    label: "Pixel",
    description: "Retrô futurista, cantos retos e contraste limpo.",
    colors: {
      ...darkSemantic,
      background: "#08070D",
      surface: "#12101B",
      surfaceAlt: "#1B1726",
      surfaceRaised: "#251F34",
      primary: "#A78BFA",
      primarySoft: "#DDD6FE",
      onPrimary: "#08070D",
      border: "#493C62",
      borderStrong: "#7963A0",
      overlay: "rgba(5,4,9,0.9)",
      tabBar: "#0B0911",
      shadow: "#000000",
      glow: "#A78BFA",
    },
    visuals: {
      cardRadius: 4,
      buttonRadius: 4,
      chipRadius: 4,
      borderWidth: 1,
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 1,
      backdrop: "grid",
      cardStyle: "terminal",
      tabActiveFill: "20",
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Superfícies discretas e hierarquia pelo conteúdo.",
    colors: {
      ...darkSemantic,
      background: "#0B0B0D",
      surface: "#101012",
      surfaceAlt: "#171719",
      surfaceRaised: "#1D1D20",
      primary: "#E6E2F2",
      primarySoft: "#FFFFFF",
      onPrimary: "#0B0B0D",
      border: "#27272B",
      borderStrong: "#44444B",
      overlay: "rgba(0,0,0,0.9)",
      tabBar: "#0B0B0D",
      shadow: "#000000",
      glow: "#E6E2F2",
    },
    visuals: {
      cardRadius: 10,
      buttonRadius: 10,
      chipRadius: 10,
      borderWidth: 1,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      backdrop: "none",
      cardStyle: "minimal",
      tabActiveFill: "12",
    },
  },
};

const LEGACY_THEME_MAP: Record<string, CoreThemeId> = {
  nexus: "nexus",
  amoled: "amoled",
  glass: "glass",
  light: "light",
  pixel: "pixel",
  minimal: "minimal",
  oneui: "minimal",
  hud: "pixel",
  aurora: "glass",
  ocean: "glass",
  ember: "nexus",
  rose: "glass",
  monochrome: "minimal",
  custom: "nexus",
};

export function resolveThemeId(theme: string | null | undefined): CoreThemeId {
  return LEGACY_THEME_MAP[theme ?? ""] ?? "nexus";
}

export function getTheme(preferences: Preferences): NexusTheme {
  return NEXUS_THEMES[resolveThemeId(String(preferences.theme))];
}

export function getColors(preferences: Preferences): NexusColors {
  return getTheme(preferences).colors;
}

export function getVisuals(preferences: Preferences): NexusVisuals {
  return getTheme(preferences).visuals;
}

export const radii = { small: 8, medium: 14, large: 18, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
