import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

export function ProgressRing({ progress, size = 128, strokeWidth = 9, label }: { progress: number; size?: number; strokeWidth?: number; label?: string }) {
  const { colors } = useNexus();
  const safe = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - safe)}
          />
        </G>
      </Svg>
      <NexusText variant="title">{label ?? `${Math.round(safe * 100)}%`}</NexusText>
    </View>
  );
}
