import { View } from "react-native";
import { PixelArt } from "@/components/PixelArt";
import { CompanionMascot } from "@/components/CompanionMascot";
import { NexusText } from "@/components/ui/NexusText";
import { scenePixels, PIXEL_PALETTE } from "@/features/mascot/sprites";
import { useNexus } from "@/providers/NexusProvider";
import type { PixelPose } from "@/features/mascot/sprites";
export function PixelHabitat({ pose = "idle", line }: { pose?: PixelPose; line?: string }) {
  const { data, colors, visuals } = useNexus();
  return <View style={{ overflow: "hidden", borderRadius: visuals.cardRadius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
    <View style={{ height: 104 }}>
      <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 0 }}><PixelArt rows={scenePixels("night")} palette={PIXEL_PALETTE} width={166.4} height={104} /></View>
      <View style={{ position: "absolute", left: 20, bottom: 6 }}><CompanionMascot mascot={data.preferences.mascot.companion} state={pose} size={72} /></View>
    </View>
    {line ? <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border }}><NexusText variant="caption" secondary>{line}</NexusText></View> : null}
  </View>;
}
