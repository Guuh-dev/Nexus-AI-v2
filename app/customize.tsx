import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot, MASCOT_LABELS } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import type {
  AssistantVerbosity,
  AtlasPersonality,
  CompanionMood,
  CompanionPresence,
  DashboardPreferences,
  DashboardSection,
  ThemeId,
} from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

const SECTION_LABELS: Record<DashboardSection, string> = {
  smart: "Nexus inteligente",
  mission: "Missão principal",
  tasks: "Tarefas",
  operation: "Operação",
  habits: "Hábitos",
  quick: "Ações rápidas",
  progress: "Progresso",
  message: "Ordem do Nexus",
};

const PRESETS: {
  id: DashboardPreferences["preset"];
  label: string;
  description: string;
  sections: DashboardSection[];
  hidden: DashboardSection[];
}[] = [
  { id: "original", label: "Nexus Original", description: "Equilíbrio entre missão, tarefas e progresso", sections: ["smart", "mission", "tasks", "quick", "progress", "operation", "habits", "message"], hidden: [] },
  { id: "minimal", label: "Minimalista", description: "Somente o essencial para hoje", sections: ["mission", "tasks", "progress", "message", "smart", "quick", "operation", "habits"], hidden: ["operation", "habits", "quick"] },
  { id: "productivity", label: "Execução", description: "Tarefas, ação imediata e follow-up primeiro", sections: ["smart", "tasks", "quick", "mission", "habits", "progress", "operation", "message"], hidden: [] },
  { id: "gamer", label: "Gamer HUD", description: "Desafios, operação e telemetria em destaque", sections: ["smart", "operation", "progress", "mission", "tasks", "habits", "quick", "message"], hidden: [] },
  { id: "focus_first", label: "Focus First", description: "Missão e entrada no foco sem ruído", sections: ["mission", "quick", "smart", "tasks", "progress", "operation", "habits", "message"], hidden: ["habits"] },
  { id: "progress_first", label: "Progress First", description: "Métricas antes do plano", sections: ["progress", "smart", "mission", "tasks", "operation", "habits", "quick", "message"], hidden: [] },
  { id: "compact", label: "Compacto", description: "Mais informação em menos espaço", sections: ["mission", "tasks", "smart", "progress", "quick", "operation", "habits", "message"], hidden: ["message"] },
  { id: "cinematic", label: "Cinemático", description: "Missão, companion e brilho visual", sections: ["smart", "mission", "operation", "tasks", "progress", "quick", "habits", "message"], hidden: [] },
];

const THEMES: { id: ThemeId; label: string; color: string; detail: string }[] = [
  { id: "nexus", label: "Nexus", color: "#8B5CF6", detail: "Roxo oficial e glow equilibrado" },
  { id: "amoled", label: "AMOLED", color: "#B89CFF", detail: "Preto absoluto e ruído mínimo" },
  { id: "oneui", label: "One UI", color: "#6EA8FF", detail: "Superfícies amplas e móveis" },
  { id: "hud", label: "Gamer HUD", color: "#32F5A5", detail: "Grade técnica e cantos retos" },
  { id: "aurora", label: "Glass Aurora", color: "#24D7E8", detail: "Vidro, profundidade e aurora" },
  { id: "ocean", label: "Deep Ocean", color: "#24B5FF", detail: "Azul profundo e estrelas" },
  { id: "ember", label: "Ember", color: "#FF6B1A", detail: "Energia quente e scanlines" },
  { id: "rose", label: "Rose", color: "#FF4FA0", detail: "Glass rosado e suave" },
  { id: "monochrome", label: "Monochrome", color: "#F4F4F5", detail: "Brutalista, limpo e direto" },
  { id: "light", label: "Light Clean", color: "#6D3BEF", detail: "Claro premium e legível" },
];

const MOODS: [CompanionMood, string][] = [
  ["happy", "Feliz"],
  ["playful", "Zoeiro"],
  ["motivational", "Motivador"],
  ["serious", "Sério"],
  ["strict", "Bravo"],
  ["calm", "Calmo"],
  ["quiet", "Quieto"],
];

const PRESENCE: [CompanionPresence, string][] = [
  ["quiet", "Raro"],
  ["balanced", "Equilibrado"],
  ["active", "Ativo"],
];

const ATLAS_PERSONALITIES: [AtlasPersonality, string][] = [
  ["teacher", "Professor"],
  ["mentor", "Mentor prático"],
  ["coach", "Coach de execução"],
  ["strict", "Exigente"],
  ["friendly", "Amigável"],
];

const VERBOSITY: [AssistantVerbosity, string][] = [
  ["compact", "Curta"],
  ["balanced", "Equilibrada"],
  ["detailed", "Detalhada"],
];

const ACCESSORY_LABELS: Record<string, string> = {
  glasses: "Óculos",
  crown: "Coroa",
  headphones: "Headset",
  cap: "Boné",
  scarf: "Cachecol",
  backpack: "Mochila",
  laptop: "Notebook",
  book: "Livro",
  coffee: "Café",
  sword: "Espada",
  controller: "Controle",
  wizard_hat: "Chapéu do Atlas",
  medal: "Medalha",
  cape: "Capa",
};

export default function CustomizeScreen() {
  const { data, colors, updatePreferences } = useNexus();
  const dashboard = data.preferences.dashboard;
  const mascotPreferences = data.preferences.mascot;

  const applyPreset = (preset: (typeof PRESETS)[number]) =>
    updatePreferences({ dashboard: { preset: preset.id, sections: preset.sections, hiddenSections: preset.hidden } });

  const move = (section: DashboardSection, direction: -1 | 1) => {
    const list = [...dashboard.sections];
    const index = list.indexOf(section);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target]!, list[index]!];
    updatePreferences({ dashboard: { sections: list, preset: "custom" } });
  };

  const toggleHidden = (section: DashboardSection) =>
    updatePreferences({
      dashboard: {
        hiddenSections: dashboard.hiddenSections.includes(section)
          ? dashboard.hiddenSections.filter((item) => item !== section)
          : [...dashboard.hiddenSections, section],
        preset: "custom",
      },
    });

  return (
    <Screen>
      <View style={styles.header}>
        <NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} />
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>COMMAND CENTER 2.2</NexusText>
          <NexusText variant="display">Do seu jeito.</NexusText>
        </View>
        <CompanionMascot mascot={mascotPreferences.companion} size={58} />
      </View>

      <Section title="Personalidade do Companion" subtitle="A personalidade global vale no app. Cada widget ainda pode ter um humor independente.">
        <Choice title="Humor padrão" options={MOODS} value={mascotPreferences.companionMood} onChange={(value) => updatePreferences({ mascot: { companionMood: value as CompanionMood } })} />
        <Choice title="Presença" options={PRESENCE} value={mascotPreferences.companionPresence} onChange={(value) => updatePreferences({ mascot: { companionPresence: value as CompanionPresence } })} />
        <View style={styles.chips}>
          <ChoiceChip label="Falas ligadas" selected={mascotPreferences.speechEnabled} onPress={() => updatePreferences({ mascot: { speechEnabled: !mascotPreferences.speechEnabled } })} />
          <ChoiceChip label="Mostrar companion" selected={mascotPreferences.showCompanion} onPress={() => updatePreferences({ mascot: { showCompanion: !mascotPreferences.showCompanion } })} />
        </View>
      </Section>

      <Section title="Professor Atlas" subtitle="Escolha como ele ensina. A trilha continua a mesma, mas a voz e o ritmo mudam.">
        <Choice title="Estilo do Atlas" options={ATLAS_PERSONALITIES} value={mascotPreferences.atlasPersonality} onChange={(value) => updatePreferences({ mascot: { atlasPersonality: value as AtlasPersonality } })} />
        <Choice title="Tamanho padrão das respostas" options={VERBOSITY} value={mascotPreferences.assistantVerbosity} onChange={(value) => updatePreferences({ mascot: { assistantVerbosity: value as AssistantVerbosity } })} />
      </Section>

      <Section title="Layouts" subtitle="Comece por um estilo e ajuste cada módulo depois.">
        <View style={styles.grid}>
          {PRESETS.map((preset) => (
            <Card key={preset.id} style={[styles.preset, { borderColor: dashboard.preset === preset.id ? colors.primary : colors.border }]}>
              <NexusText variant="title">{preset.label}</NexusText>
              <NexusText variant="caption" secondary>{preset.description}</NexusText>
              <NexusButton label={dashboard.preset === preset.id ? "Ativo" : "Aplicar"} variant={dashboard.preset === preset.id ? "secondary" : "ghost"} onPress={() => applyPreset(preset)} fullWidth />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Ordem e visibilidade" subtitle="Mova, esconda e recupere qualquer módulo.">
        {dashboard.sections.map((section, index) => {
          const hidden = dashboard.hiddenSections.includes(section);
          return (
            <Card key={section} style={[styles.sectionRow, { opacity: hidden ? 0.55 : 1 }]}>
              <View style={styles.flex}>
                <NexusText variant="subtitle">{SECTION_LABELS[section]}</NexusText>
                <NexusText variant="caption" secondary>{hidden ? "Oculto" : `Posição ${index + 1}`}</NexusText>
              </View>
              <View style={styles.rowActions}>
                <NexusButton label="↑" variant="ghost" onPress={() => move(section, -1)} />
                <NexusButton label="↓" variant="ghost" onPress={() => move(section, 1)} />
                <NexusButton label={hidden ? "Mostrar" : "Ocultar"} variant="ghost" onPress={() => toggleHidden(section)} />
              </View>
            </Card>
          );
        })}
      </Section>

      <Section title="Densidade e efeitos">
        <Choice title="Densidade" options={[["compacta", "Compacta"], ["confortavel", "Confortável"], ["ampla", "Ampla"]]} value={dashboard.density} onChange={(value) => updatePreferences({ dashboard: { density: value as DashboardPreferences["density"] } })} />
        <Choice title="Brilho" options={[["desligado", "Desligado"], ["sutil", "Sutil"], ["medio", "Médio"], ["intenso", "Intenso"]]} value={dashboard.glow} onChange={(value) => updatePreferences({ dashboard: { glow: value as DashboardPreferences["glow"] } })} />
        <Choice title="Fundo" options={[["nenhum", "Limpo"], ["grade", "Grade"], ["estrelas", "Estrelas"], ["aurora", "Aurora"], ["scanlines", "Scanlines"]]} value={dashboard.backgroundEffect} onChange={(value) => updatePreferences({ dashboard: { backgroundEffect: value as DashboardPreferences["backgroundEffect"] } })} />
      </Section>

      <Section title="Temas de verdade" subtitle="Cada tema muda fundo, cards, cantos, tab bar, glow e densidade visual.">
        <View style={styles.grid}>
          {THEMES.map((theme) => (
            <Card key={theme.id} style={[styles.theme, { borderColor: data.preferences.theme === theme.id ? theme.color : colors.border }]}>
              <View style={[styles.color, { backgroundColor: theme.color }]} />
              <NexusText variant="subtitle">{theme.label}</NexusText>
              <NexusText variant="caption" secondary style={styles.center}>{theme.detail}</NexusText>
              <NexusButton label={data.preferences.theme === theme.id ? "Ativo" : "Usar"} variant="ghost" onPress={() => updatePreferences({ theme: theme.id })} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Companheiro" subtitle="Nexus continua sendo o mascote principal. Escolha quem aparece como parceiro no app.">
        <View style={styles.grid}>
          {(["atlas", "nova", "byte", "pulse", "orbit", "ember"] as const).map((mascot) => (
            <Card key={mascot} style={[styles.mascot, { borderColor: mascotPreferences.companion === mascot ? colors.primary : colors.border }]}>
              <CompanionMascot mascot={mascot} size={70} />
              <NexusText variant="subtitle">{MASCOT_LABELS[mascot]}</NexusText>
              <NexusButton label={mascotPreferences.companion === mascot ? "Ativo" : "Escolher"} variant="ghost" onPress={() => updatePreferences({ mascot: { companion: mascot, showCompanion: true } })} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Visuais do Professor Atlas" subtitle="A personalidade e o visual são independentes. Atlas pode ser mentor sério e continuar rosa, por exemplo.">
        <View style={styles.grid}>
          {([['classic', 'Clássico'], ['emerald', 'Esmeralda'], ['gold', 'Dourado'], ['ice', 'Gelo'], ['rose', 'Rose']] as const).map(([variant, label]) => (
            <Card key={variant} style={[styles.mascot, { borderColor: mascotPreferences.professorVariant === variant ? colors.primary : colors.border }]}>
              <CompanionMascot mascot="atlas" variant={variant} size={70} />
              <NexusText variant="subtitle">{label}</NexusText>
              <NexusButton label={mascotPreferences.professorVariant === variant ? "Ativo" : "Usar"} variant="ghost" onPress={() => updatePreferences({ mascot: { professorVariant: variant } })} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Skins da cobrinha Nexus" subtitle="A skin também acompanha o widget.">
        <View style={styles.grid}>
          {mascotPreferences.unlockedSkins.map((skin) => (
            <Card key={skin} style={[styles.mascot, { borderColor: mascotPreferences.skin === skin ? colors.primary : colors.border }]}>
              <PixelMascot skin={skin} accessory={skin === "professor" ? "glasses" : ""} size={70} />
              <NexusText variant="subtitle">{{ classic: "Clássica", shadow: "Shadow", galaxy: "Galaxy", emerald: "Emerald", gold: "Gold", ice: "Ice", rose: "Rose", professor: "Professor" }[skin]}</NexusText>
              <NexusButton label={mascotPreferences.skin === skin ? "Ativa" : "Usar"} variant="ghost" onPress={() => updatePreferences({ mascot: { skin } })} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Acessórios" subtitle="Combine com qualquer skin. Os novos acessórios são desenhados para serem reconhecidos mesmo em tamanho pequeno.">
        <View style={styles.chips}>
          <ChoiceChip label="Nenhum" selected={!mascotPreferences.equippedAccessory} onPress={() => updatePreferences({ mascot: { equippedAccessory: undefined } })} />
          {mascotPreferences.accessories.map((accessory) => (
            <ChoiceChip key={accessory} label={ACCESSORY_LABELS[accessory] ?? accessory} selected={mascotPreferences.equippedAccessory === accessory} onPress={() => updatePreferences({ mascot: { equippedAccessory: accessory } })} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.title}><NexusText variant="title">{title}</NexusText>{subtitle ? <NexusText variant="caption" secondary>{subtitle}</NexusText> : null}</View>{children}</View>;
}

function Choice({ title, options, value, onChange }: { title: string; options: readonly (readonly [string, string])[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.choice}><NexusText variant="caption" secondary>{title}</NexusText><View style={styles.chips}>{options.map(([id, label]) => <ChoiceChip key={id} label={label} selected={value === id} onPress={() => onChange(id)} />)}</View></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  section: { marginTop: 28, gap: 13 },
  title: { gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  preset: { width: "48%", flexGrow: 1, minHeight: 166, gap: 9 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 3 },
  choice: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  theme: { width: "48%", minWidth: 144, flexGrow: 1, alignItems: "center", gap: 8, minHeight: 176 },
  color: { width: 38, height: 38, borderRadius: 13 },
  mascot: { width: "48%", flexGrow: 1, alignItems: "center", gap: 8 },
  center: { textAlign: "center" },
});
