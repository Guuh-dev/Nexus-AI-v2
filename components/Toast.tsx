import { Pressable, StyleSheet, View } from "react-native";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

export function Toast() {
  const { toast, dismissToast, colors } = useNexus();
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${toast}. Toque para fechar.`}
        onPress={dismissToast}
        style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}
      >
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <NexusText variant="caption" style={styles.text}>{toast}</NexusText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 16, right: 16, bottom: 92, alignItems: "center", zIndex: 999 },
  toast: { maxWidth: 520, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flexShrink: 1 },
});
