import { PixelArt } from "@/components/PixelArt";
import { View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";
import { PIXEL_PALETTE, personalitySprite, type PixelKind, type PixelPose } from "@/features/mascot/sprites";
import type { CompanionMood, MascotSkin } from "@/types";
export type MascotState = PixelPose;
export function PixelCharacter({ kind, state = "idle", size = 48, skin, accessory, mood, fixedPalette = false }: { mood?: CompanionMood; fixedPalette?: boolean; kind: PixelKind; state?: PixelPose; size?: number; skin?: MascotSkin; accessory?: string }) {
  const { data, colors } = useNexus();
  const selectedSkin = skin ?? data.preferences.mascot.skin;
  const tint = kind === "atlas" ? ({ classic: colors.success, emerald: colors.success, gold: colors.warning, ice: colors.primarySoft, rose: colors.danger }[data.preferences.mascot.professorVariant]) : ({ classic: colors.primary, shadow: colors.textSecondary, galaxy: colors.primary, emerald: colors.success, gold: colors.warning, ice: colors.primarySoft, rose: colors.danger, professor: colors.success }[selectedSkin]);
  const selectedAccessory = accessory ?? data.preferences.mascot.equippedAccessory;
  const personality = mood ?? (kind === "atlas" ? data.preferences.mascot.atlasMood ?? data.preferences.mascot.companionMood : data.preferences.mascot.companionMood);
  const rows = personalitySprite(kind, personality, kind === "nexus" && selectedAccessory === "book" && state === "idle" ? "reading" : state);
  const grid = rows.length;
  const pixel = Math.max(1, Math.floor(size / grid));
  const palette = fixedPalette || (kind === "atlas" ? data.preferences.mascot.professorVariant === "classic" : selectedSkin === "classic") ? PIXEL_PALETTE : { ...PIXEL_PALETTE, b: kind === "nexus" ? tint : PIXEL_PALETTE.b, a: kind === "atlas" ? tint : PIXEL_PALETTE.a };
  return <View accessibilityRole="image" accessibilityLabel={`${kind === "atlas" ? "Professor Atlas" : "Nexus"}: ${{ idle: "pronto", thinking: "foco", sleeping: "pausa", celebrating: "concluído", warning: "atenção", reading: "livro" }[state]}`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}><PixelArt rows={rows} palette={palette} width={pixel * grid} height={pixel * grid} /></View>;
}
export function PixelMascot(props: { state?: MascotState; size?: number; skin?: MascotSkin; accessory?: string; mood?: CompanionMood }) { return <PixelCharacter kind="nexus" {...props} />; }
