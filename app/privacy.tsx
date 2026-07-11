import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { PixelMascot } from "@/components/PixelMascot";
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

export default function PrivacyScreen() {
  const { colors } = useNexus();
  return (
    <Screen>
      <View style={styles.header}>
        <PixelMascot state="idle" size={60} />
        <View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PRIVACIDADE</NexusText><NexusText variant="display">Seus dados, sob seu controle.</NexusText></View>
      </View>
      <NexusText secondary>Última atualização: 10 de julho de 2026.</NexusText>
      <Policy title="Armazenamento local">Perfil, tarefas, XP, foco, preferências e histórico ficam no dispositivo ou navegador. O Nexus 2.1 não exige conta.</Policy>
      <Policy title="Planejamento online">Quando disponível, objetivo, motivo, rotina, prioridades e tempo são enviados ao servidor para criação do plano pela OpenRouter. A chave da API nunca é enviada ao aplicativo.</Policy>
      <Policy title="Modo offline">Sem conexão ou provedor, o plano é criado localmente sem transmitir dados.</Policy>
      <Policy title="O que não acessamos">Contatos, fotos, mensagens, localização precisa, dados bancários, conteúdo de outros aplicativos e identificadores publicitários.</Policy>
      <Policy title="Exportação e exclusão">O Perfil permite exportar backup JSON, reiniciar o dia ou apagar todos os dados. Desinstalar o app normalmente remove dados não exportados.</Policy>
      <Policy title="Notificações">Lembretes são opcionais. Negar permissão não limita os demais recursos.</Policy>
      <Policy title="Mudanças futuras">Login, sincronização, pagamentos ou analytics exigirão atualização desta política antes do lançamento.</Policy>
      <NexusButton label="Voltar ao Nexus" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
    </Screen>
  );
}

function Policy({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card style={styles.card}><NexusText variant="title">{title}</NexusText><NexusText secondary>{children}</NexusText></Card>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  flex: { flex: 1 },
  card: { gap: 8, marginTop: 12 },
});
