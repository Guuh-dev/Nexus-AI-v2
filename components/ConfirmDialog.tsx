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
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { colors } = useNexus();
  const cancel = () => {
    if (!loading) onCancel();
  };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={cancel}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar diálogo" onPress={cancel} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.container}>
          <Card elevated style={styles.card}>
            <NexusText variant="title">{title}</NexusText>
            <NexusText secondary>{message}</NexusText>
            {children}
            <View style={styles.actions}>
              <NexusButton label="Cancelar" variant="ghost" disabled={loading} onPress={cancel} style={styles.flex} />
              <NexusButton label={confirmLabel} variant={destructive ? "danger" : "primary"} loading={loading} onPress={() => { void onConfirm(); }} style={styles.flex} />
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
