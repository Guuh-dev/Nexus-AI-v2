import { View } from "react-native";
import { PixelArt } from "@/components/PixelArt";
import { CompanionMascot } from "@/components/CompanionMascot";
import { scenePixels, PIXEL_PALETTE } from "@/features/mascot/sprites";
import { useNexus } from "@/providers/NexusProvider";
import type { PixelPose } from "@/features/mascot/sprites";
export function PixelHabitat({ pose = "idle" }: { pose?: PixelPose }) {
  const { data, colors } = useNexus();
  return <View style={{ height: 104, overflow: "hidden", borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
    <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 0 }}><PixelArt rows={scenePixels("night")} palette={PIXEL_PALETTE} width={166.4} height={104} /></View>
    <View style={{ position: "absolute", left: "32%", bottom: 6 }}><CompanionMascot mascot={data.preferences.mascot.companion} state={pose} size={72} /></View>
  </View>;
}
