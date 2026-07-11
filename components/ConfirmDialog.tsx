import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { colors } = useNexus();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar diálogo" onPress={onCancel} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.container}>
          <Card elevated style={styles.card}>
            <NexusText variant="title">{title}</NexusText>
            <NexusText secondary>{message}</NexusText>
            {children}
            <View style={styles.actions}>
              <NexusButton label="Cancelar" variant="ghost" onPress={onCancel} style={styles.flex} />
              <NexusButton label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} style={styles.flex} />
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { width: "100%", maxWidth: 460 },
  card: { gap: 14, padding: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  flex: { flex: 1 },
});
