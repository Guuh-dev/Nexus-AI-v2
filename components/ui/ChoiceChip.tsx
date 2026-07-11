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
  const { colors } = useNexus();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? `${colors.primary}24` : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <NexusText>{icon}</NexusText> : null}
      <NexusText variant="caption" color={selected ? colors.primarySoft : colors.text}>
        {label}
      </NexusText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
});
