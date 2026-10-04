import { Pressable, StyleSheet } from "react-native";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
};

export function ChoiceChip({ label, selected, onPress, icon }: Props) {
  const { colors, visuals } = useNexus();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? `${colors.primary}1F` : colors.surfaceAlt,
          borderColor: selected ? `${colors.primary}99` : "transparent",
          borderRadius: visuals.chipRadius,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <NexusText>{icon}</NexusText> : null}
      <NexusText variant="caption" color={selected ? colors.primarySoft : colors.text} style={selected ? styles.selected : undefined}>
        {label}
      </NexusText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  selected: { fontWeight: "600" },
});
