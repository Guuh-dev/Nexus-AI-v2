import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { PixelMascot } from "@/components/PixelMascot";
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";
import { OTA_RELEASE } from "@/constants/release";

export { RouteErrorBoundary as ErrorBoundary };

export default function PrivacyScreen() {
  const { colors } = useNexus();
  return (
    <Screen>
      <View style={styles.header}>
        <PixelMascot state="idle" size={60} />
        <View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PRIVACIDADE</NexusText><NexusText variant="display">Seus dados, sob seu controle.</NexusText></View>
      </View>
      <NexusText secondary>Versão {OTA_RELEASE.label} • última atualização: 13 de julho de 2026.</NexusText>
      <Policy title="Armazenamento local">Perfil, planos, tarefas, XP, foco, preferências, conversas, memórias, roadmaps e revisões ficam no armazenamento local do aplicativo ou navegador. O Nexus não exige conta nem sincroniza esses dados entre aparelhos.</Policy>
      <Policy title="Recursos remotos">Conforme o recurso usado, o aplicativo envia ao backend do Nexus trechos necessários do perfil, plano atual, histórico recente, foco, memórias, conversa e roadmaps. Isso permite planejamento, Brain, Professor Atlas, captura estruturada e revisão semanal sem enviar a chave da API ao aplicativo.</Policy>
      <Policy title="Roteamento e retenção">O backend encaminha solicitações à OpenRouter e pede somente endpoints com coleta de dados negada e zero data retention. Respostas têm validade de reutilização de dez minutos no cache em memória para idempotência; a remoção física depende da limpeza ou reinício do processo. Metadados técnicos, como ID da solicitação, modo, modelo, latência e erro, podem aparecer nos logs operacionais; o Nexus não grava deliberadamente o texto integral nessas telemetrias.</Policy>
      <Policy title="Modo offline">Planejamento e captura podem usar processamento local, sempre identificados como offline ou local. Brain, Professor Atlas, roadmaps e revisão remota informam indisponibilidade e preservam o texto; não fingem uma resposta de IA offline.</Policy>
      <Policy title="O que não acessamos">Contatos, fotos, mensagens, localização precisa, dados bancários, conteúdo de outros aplicativos e identificadores publicitários.</Policy>
      <Policy title="Exportação e exclusão">O Perfil permite exportar um backup JSON legível, importar com confirmação, desfazer a última importação, reiniciar o dia ou apagar os dados. O arquivo exportado deixa a área privada do app quando você o compartilha e deve ser protegido por você.</Policy>
      <Policy title="Notificações">Lembretes são opcionais. Negar permissão não limita os demais recursos.</Policy>
      <Policy title="Mudanças futuras">Login, sincronização, pagamentos, publicidade ou analytics exigirão atualização desta política antes de serem lançados.</Policy>
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
