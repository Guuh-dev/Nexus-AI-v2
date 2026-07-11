import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNexus } from "@/providers/NexusProvider";

type Props = PropsWithChildren<{
  scroll?: boolean;
  footer?: ReactNode;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, footer, contentContainerStyle, padded = true }: Props) {
  const { colors } = useNexus();
  const content = (
    <View style={[styles.inner, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  inner: { width: "100%", maxWidth: 760, flex: 1 },
  padded: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 36 },
});
