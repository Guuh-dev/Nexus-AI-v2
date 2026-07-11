import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { PixelMascot } from "@/components/PixelMascot";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";

export default function NotFound() {
  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <PixelMascot state="warning" size={80} />
        <NexusText variant="mono">ROTA NÃO ENCONTRADA</NexusText>
        <NexusText variant="display" style={styles.center}>Essa missão não existe.</NexusText>
        <NexusText secondary style={styles.center}>O restante do seu plano continua seguro.</NexusText>
        <NexusButton label="Voltar ao Nexus" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 13 },
  center: { textAlign: "center" },
});
