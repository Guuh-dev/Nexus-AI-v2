import { StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { WidgetPreview } from "@/components/WidgetPreview";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import type { MascotId, WidgetPreferences, WidgetSize, WidgetStyle } from "@/types";

export { RouteErrorBoundary as ErrorBoundary };
const SIZES: WidgetSize[] = ["1x1","2x1","2x2","3x2","4x1","4x2","4x3","4x4","5x2"];
const STYLES: [WidgetStyle,string][] = [["nexus","Nexus"],["amoled","AMOLED"],["transparent","Transparente"],["glass","Glass"],["pixel","Pixel"],["minimal","Minimal"],["gamer","Gamer"],["privacy","Privacidade"]];

export default function WidgetStudioScreen() {
  const { data, colors, updatePreferences } = useNexus();
  const widget = data.preferences.widget;
  const patch = (value: Partial<WidgetPreferences>) => updatePreferences({ widget: value });
  return <Screen>
    <View style={styles.header}><NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>WIDGET STUDIO</NexusText><NexusText variant="display">Sua tela inicial.</NexusText></View><CompanionMascot mascot="byte" size={58} /></View>
    <NexusText secondary>O widget se adapta ao espaço real do launcher. As tarefas podem ser concluídas direto nele e sincronizam com XP ao abrir o app.</NexusText>
    <View style={styles.preview}><WidgetPreview /></View>
    <Section title="Tamanho preferido" subtitle="Depois de adicionar, você também pode redimensionar pelo Android."><View style={styles.chips}>{SIZES.map((size) => <ChoiceChip key={size} label={size} selected={widget.preferredSize === size} onPress={() => patch({ preferredSize: size })} />)}</View></Section>
    <Section title="Estilo"><View style={styles.chips}>{STYLES.map(([value,label]) => <ChoiceChip key={value} label={label} selected={widget.style === value} onPress={() => patch({ style: value, privacyMode: value === "privacy" ? true : widget.privacyMode, background: value === "amoled" ? "amoled" : value === "transparent" || value === "glass" ? "translucent" : "solid" })} />)}</View><Field label="Cor de destaque" value={widget.accentColor ?? data.preferences.customAccent} onChangeText={(value) => patch({ accentColor: value })} maxLength={7} placeholder="#8B5CF6" /></Section>
    <Section title="Conteúdo"><Toggle label="Mascote principal" value={widget.showMascot} onChange={(value) => patch({ showMascot: value })} /><Toggle label="Professor ao lado" value={widget.showProfessor} onChange={(value) => patch({ showProfessor: value })} /><Toggle label="Próxima lição" value={widget.showLearning} onChange={(value) => patch({ showLearning: value })} /><Toggle label="Missão" value={widget.showMission} onChange={(value) => patch({ showMission: value })} /><Toggle label="Tarefas" value={widget.showTasks} onChange={(value) => patch({ showTasks: value })} /><Toggle label="Sequência" value={widget.showStreak} onChange={(value) => patch({ showStreak: value })} /><Toggle label="XP" value={widget.showXp} onChange={(value) => patch({ showXp: value })} /><Toggle label="Nível" value={widget.showLevel} onChange={(value) => patch({ showLevel: value })} /><Toggle label="Privacidade" value={widget.privacyMode} onChange={(value) => patch({ privacyMode: value })} /><View style={styles.chips}>{([1,2,3,4,5] as const).map((count) => <ChoiceChip key={count} label={`${count} tarefa${count > 1 ? "s" : ""}`} selected={widget.taskCount === count} onPress={() => patch({ taskCount: count })} />)}</View></Section>
    <Section title="Progresso e tipografia"><View style={styles.chips}>{(["bar","circle","text","number"] as const).map((style) => <ChoiceChip key={style} label={{ bar: "Barra", circle: "Círculo", text: "Texto", number: "Número" }[style]} selected={widget.progressStyle === style} onPress={() => patch({ progressStyle: style })} />)}</View><View style={styles.chips}>{(["pequena","normal","grande"] as const).map((size) => <ChoiceChip key={size} label={{ pequena: "Fonte pequena", normal: "Fonte normal", grande: "Fonte grande" }[size]} selected={widget.fontScale === size} onPress={() => patch({ fontScale: size })} />)}</View><View style={styles.chips}>{[0.5,0.7,0.85,0.96,1].map((opacity) => <ChoiceChip key={opacity} label={`${Math.round(opacity * 100)}% opacidade`} selected={widget.opacity === opacity} onPress={() => patch({ opacity })} />)}</View></Section>
    <Section title="Mascote principal do widget" subtitle="O Atlas pode aparecer como professor ao lado, sem substituir sua cobrinha."><View style={styles.mascots}>{(["nexus","atlas","nova","byte","pulse"] as MascotId[]).map((mascot) => <View key={mascot} style={styles.mascot}><CompanionMascot mascot={mascot} size={48} /><ChoiceChip label={mascot === "nexus" ? "Nexus" : mascot[0]!.toUpperCase() + mascot.slice(1)} selected={widget.mascot === mascot} onPress={() => patch({ mascot })} /></View>)}</View></Section>
    <NexusText variant="caption" secondary style={styles.note}>Mudanças nativas do Widget Studio exigem instalar o novo APK. O preview web mostra apenas a aparência aproximada.</NexusText>
  </Screen>;
}
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <View style={styles.section}><View style={styles.title}><NexusText variant="title">{title}</NexusText>{subtitle ? <NexusText variant="caption" secondary>{subtitle}</NexusText> : null}</View>{children}</View>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { const { colors } = useNexus(); return <View style={[styles.toggle, { borderBottomColor: colors.border }]}><NexusText variant="subtitle" style={styles.flex}>{label}</NexusText><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor="#FFF" /></View>; }
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, preview: { marginTop: 22 }, section: { marginTop: 27, gap: 12 }, title: { gap: 4 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, toggle: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth }, mascots: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, mascot: { alignItems: "center", gap: 5 }, note: { textAlign: "center", marginTop: 28 } });
