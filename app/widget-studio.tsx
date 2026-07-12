import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { WidgetPreview } from "@/components/WidgetPreview";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { applyWidgetPreset, WIDGET_PRESETS } from "@/features/widget/presets";
import { useNexus } from "@/providers/NexusProvider";
import type {
  MascotId,
  WidgetPreferences,
  WidgetSize,
  WidgetStyle,
  WidgetTapAction,
} from "@/types";
import { normalizeHexColor } from "@/utils/text";

export { RouteErrorBoundary as ErrorBoundary };

type StudioTab = "presets" | "content" | "visual" | "actions";

const SIZES: { value: WidgetSize; label: string; hint: string }[] = [
  { value: "1x1", label: "1×1", hint: "Mascote ou streak" },
  { value: "2x1", label: "2×1", hint: "Resumo horizontal" },
  { value: "2x2", label: "2×2", hint: "Missão compacta" },
  { value: "3x2", label: "3×2", hint: "Missão + ações" },
  { value: "4x1", label: "4×1", hint: "Barra de comando" },
  { value: "4x2", label: "4×2", hint: "Command Center" },
  { value: "4x3", label: "4×3", hint: "Dashboard" },
  { value: "4x4", label: "4×4", hint: "Central completa" },
  { value: "5x2", label: "5×2", hint: "Launchers grandes" },
];

const STYLES: { value: WidgetStyle; label: string; description: string }[] = [
  { value: "nexus", label: "Nexus", description: "Visual oficial equilibrado" },
  { value: "amoled", label: "AMOLED", description: "Preto absoluto e econômico" },
  { value: "transparent", label: "Transparente", description: "Integra ao wallpaper" },
  { value: "glass", label: "Glass", description: "Vidro fosco controlado" },
  { value: "pixel", label: "Pixel", description: "Bordas retrô e mascote" },
  { value: "minimal", label: "Minimal", description: "Pouco ruído visual" },
  { value: "gamer", label: "Gamer", description: "HUD e contraste forte" },
  { value: "neon", label: "Neon", description: "Brilho futurista moderado" },
  { value: "mascot", label: "Mascot", description: "Personagem em destaque" },
  { value: "privacy", label: "Privacidade", description: "Oculta conteúdo sensível" },
];

const COLOR_PRESETS = ["#8B5CF6", "#38BDF8", "#10B981", "#F59E0B", "#F97316", "#EC4899", "#E4E4E7"];

export default function WidgetStudioScreen() {
  const { data, colors, updatePreferences } = useNexus();
  const widget = data.preferences.widget;
  const [tab, setTab] = useState<StudioTab>("presets");
  const [accentDraft, setAccentDraft] = useState(widget.accentColor ?? data.preferences.customAccent);
  const [accentError, setAccentError] = useState("");

  const patch = (value: Partial<WidgetPreferences>, keepPreset = false) => {
    updatePreferences({ widget: { ...value, ...(keepPreset ? {} : { preset: "custom" }) } });
  };

  const applyPreset = (presetId: Exclude<WidgetPreferences["preset"], "custom">) => {
    updatePreferences({ widget: applyWidgetPreset(widget, presetId) });
  };

  const saveAccent = () => {
    const normalized = normalizeHexColor(accentDraft, "");
    if (!normalized) {
      setAccentError("Use uma cor hexadecimal completa, por exemplo #8B5CF6.");
      return;
    }
    setAccentDraft(normalized);
    setAccentError("");
    patch({ accentColor: normalized });
  };

  const previewSummary = useMemo(() => {
    const visible = [
      widget.showMission && "missão",
      widget.showTasks && `${widget.taskCount} tarefas`,
      widget.showLearning && "Atlas",
      widget.showFocus && "foco",
      widget.showProgress && "progresso",
    ].filter(Boolean);
    return visible.join(" • ") || "somente mascote";
  }, [widget]);

  return (
    <Screen maxWidth={820}>
      <View style={styles.header}>
        <NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} />
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>WIDGET STUDIO 2.1.2</NexusText>
          <NexusText variant="display">Sua tela inicial, do seu jeito.</NexusText>
        </View>
        <CompanionMascot mascot="byte" size={58} />
      </View>
      <NexusText secondary>
        Presets inspirados no seu Command Center. Eles usam o motor real já instalado no Android e cada instância continua independente.
      </NexusText>

      <Card style={[styles.previewShell, { borderColor: `${colors.primary}44` }]}> 
        <View style={styles.previewTop}>
          <View>
            <NexusText variant="mono" color={colors.primarySoft}>PREVIEW AO VIVO</NexusText>
            <NexusText variant="caption" secondary>{widget.preferredSize} • {previewSummary}</NexusText>
          </View>
          <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
        </View>
        <WidgetPreview />
      </Card>

      <View style={[styles.tabs, { backgroundColor: colors.surface }]}> 
        {([
          ["presets", "Presets"],
          ["content", "Conteúdo"],
          ["visual", "Visual"],
          ["actions", "Ações"],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={[
              styles.tab,
              tab === value && { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}55` },
            ]}
          >
            <NexusText variant="caption" color={tab === value ? colors.primarySoft : colors.textSecondary}>{label}</NexusText>
          </Pressable>
        ))}
      </View>

      {tab === "presets" ? (
        <View style={styles.sectionStack}>
          <Section title="Comece com uma intenção" subtitle="Um toque aplica tamanho, conteúdo e ação recomendados.">
            <View style={styles.presetGrid}>
              {WIDGET_PRESETS.map((preset) => {
                const selected = widget.preset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => applyPreset(preset.id)}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: selected ? `${colors.primary}14` : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <NexusText variant="subtitle">{preset.label}</NexusText>
                      <NexusText color={selected ? colors.primarySoft : colors.textSecondary}>{selected ? "●" : "○"}</NexusText>
                    </View>
                    <NexusText variant="caption" secondary>{preset.description}</NexusText>
                    <NexusText variant="mono" color={colors.primarySoft}>{preset.recommendedSize}</NexusText>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Tamanho preferido" subtitle="O launcher pode redimensionar depois; o preview já adapta o conteúdo.">
            <View style={styles.sizeGrid}>
              {SIZES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => patch({ preferredSize: item.value })}
                  style={[
                    styles.sizeCard,
                    {
                      backgroundColor: widget.preferredSize === item.value ? `${colors.primary}14` : colors.surface,
                      borderColor: widget.preferredSize === item.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <NexusText variant="title">{item.label}</NexusText>
                  <NexusText variant="caption" secondary>{item.hint}</NexusText>
                </Pressable>
              ))}
            </View>
          </Section>
        </View>
      ) : null}

      {tab === "content" ? (
        <View style={styles.sectionStack}>
          <Section title="Informações principais" subtitle="Desligue tudo que não merece espaço na tela inicial.">
            <Toggle label="Mascote principal" description="Mostra Nexus ou o companheiro escolhido." value={widget.showMascot} onChange={(value) => patch({ showMascot: value })} />
            <Toggle label="Professor ao lado" description="Atlas acompanha a cobrinha sem substituí-la." value={widget.showProfessor} onChange={(value) => patch({ showProfessor: value })} />
            <Toggle label="Próxima lição" description="Exibe o próximo passo do roadmap ativo." value={widget.showLearning} onChange={(value) => patch({ showLearning: value })} />
            <Toggle label="Missão principal" description="Título da missão de hoje." value={widget.showMission} onChange={(value) => patch({ showMission: value })} />
            <Toggle label="Tarefas" description="Permite concluir diretamente quando houver espaço." value={widget.showTasks} onChange={(value) => patch({ showTasks: value })} />
            <Toggle label="Progresso" description="Barra, círculo, texto ou porcentagem." value={widget.showProgress} onChange={(value) => patch({ showProgress: value })} />
            <Toggle label="Captura rápida" description="Botão para registrar uma tarefa sem navegar pelo app." value={widget.showCapture} onChange={(value) => patch({ showCapture: value })} />
          </Section>

          <Section title="Métricas">
            <Toggle label="Sequência" description="Streak atual." value={widget.showStreak} onChange={(value) => patch({ showStreak: value })} />
            <Toggle label="XP" description="XP acumulado." value={widget.showXp} onChange={(value) => patch({ showXp: value })} />
            <Toggle label="Nível" description="Nível atual do Nexus." value={widget.showLevel} onChange={(value) => patch({ showLevel: value })} />
            <Toggle label="Tempo de foco" description="Minutos acumulados em sessões." value={widget.showFocus} onChange={(value) => patch({ showFocus: value })} />
          </Section>

          <Section title="Lista de tarefas">
            <View style={styles.chips}>
              {([1, 2, 3, 4, 5] as const).map((count) => (
                <ChoiceChip key={count} label={`${count} tarefa${count > 1 ? "s" : ""}`} selected={widget.taskCount === count} onPress={() => patch({ taskCount: count })} />
              ))}
            </View>
            <Toggle label="Linhas compactas" description="Aproxima as tarefas e cabe melhor em widgets baixos." value={widget.compactTasks} onChange={(value) => patch({ compactTasks: value })} />
          </Section>

          <Section title="Privacidade">
            <Toggle label="Ocultar textos sensíveis" description="Substitui missão, tarefa e aula por rótulos privados." value={widget.privacyMode} onChange={(value) => patch({ privacyMode: value, style: value ? "privacy" : widget.style })} />
          </Section>
        </View>
      ) : null}

      {tab === "visual" ? (
        <View style={styles.sectionStack}>
          <Section title="Estilo visual">
            <View style={styles.styleGrid}>
              {STYLES.map((item) => {
                const selected = widget.style === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => patch({
                      style: item.value,
                      privacyMode: item.value === "privacy" ? true : widget.privacyMode,
                      background: item.value === "amoled" ? "amoled" : item.value === "transparent" || item.value === "glass" ? "translucent" : "solid",
                    })}
                    style={[
                      styles.styleCard,
                      {
                        backgroundColor: selected ? `${colors.primary}14` : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <NexusText variant="subtitle">{item.label}</NexusText>
                    <NexusText variant="caption" secondary>{item.description}</NexusText>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Cor de destaque">
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((color) => (
                <Pressable
                  key={color}
                  accessibilityLabel={`Usar cor ${color}`}
                  onPress={() => { setAccentDraft(color); setAccentError(""); patch({ accentColor: color }); }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color, borderColor: widget.accentColor === color ? "#FFFFFF" : "transparent" },
                  ]}
                />
              ))}
            </View>
            <Field
              label="Cor personalizada"
              value={accentDraft}
              onChangeText={(value) => { setAccentDraft(value.toUpperCase()); setAccentError(""); }}
              onSubmitEditing={saveAccent}
              onBlur={saveAccent}
              maxLength={7}
              placeholder="#8B5CF6"
              error={accentError}
              autoCapitalize="characters"
            />
          </Section>

          <Section title="Forma e profundidade">
            <OptionRow title="Cantos" options={[["square", "Quadrados"], ["soft", "Suaves"], ["round", "Arredondados"]]} value={widget.cornerStyle} onChange={(value) => patch({ cornerStyle: value as WidgetPreferences["cornerStyle"] })} />
            <OptionRow title="Borda" options={[["none", "Sem borda"], ["subtle", "Sutil"], ["accent", "Colorida"], ["pixel", "Pixel"]]} value={widget.borderStyle} onChange={(value) => patch({ borderStyle: value as WidgetPreferences["borderStyle"] })} />
            <OptionRow title="Brilho" options={[[0, "Desligado"], [1, "Sutil"], [2, "Médio"], [3, "Forte"]]} value={widget.glow} onChange={(value) => patch({ glow: Number(value) as 0 | 1 | 2 | 3 })} />
            <OptionRow title="Alinhamento" options={[["left", "Esquerda"], ["center", "Centro"]]} value={widget.textAlign} onChange={(value) => patch({ textAlign: value as WidgetPreferences["textAlign"] })} />
          </Section>

          <Section title="Tipografia e transparência">
            <OptionRow title="Fonte" options={[["pequena", "Pequena"], ["normal", "Normal"], ["grande", "Grande"]]} value={widget.fontScale} onChange={(value) => patch({ fontScale: value as WidgetPreferences["fontScale"] })} />
            <OptionRow title="Opacidade" options={[[0.5, "50%"], [0.7, "70%"], [0.85, "85%"], [0.96, "96%"], [1, "100%"]]} value={widget.opacity} onChange={(value) => patch({ opacity: Number(value) })} />
            <Field label="Rótulo superior" value={widget.customLabel ?? ""} onChangeText={(value) => patch({ customLabel: value.slice(0, 24) })} maxLength={24} placeholder="NEXUS ONLINE" hint="Deixe vazio para usar o rótulo padrão." />
          </Section>

          <Section title="Mascote do widget" subtitle="Atlas pode continuar ao lado, sem substituir a cobrinha principal.">
            <View style={styles.mascots}>
              {(["nexus", "atlas", "nova", "byte", "pulse"] as MascotId[]).map((mascot) => (
                <Pressable
                  key={mascot}
                  onPress={() => patch({ mascot })}
                  style={[
                    styles.mascot,
                    {
                      backgroundColor: widget.mascot === mascot ? `${colors.primary}14` : colors.surface,
                      borderColor: widget.mascot === mascot ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <CompanionMascot mascot={mascot} size={48} />
                  <NexusText variant="caption">{mascot === "nexus" ? "Nexus" : mascot[0]!.toUpperCase() + mascot.slice(1)}</NexusText>
                </Pressable>
              ))}
            </View>
          </Section>
        </View>
      ) : null}

      {tab === "actions" ? (
        <View style={styles.sectionStack}>
          <Section title="Toque no fundo do widget" subtitle="Escolha para onde o app abre.">
            <ActionGrid value={widget.tapAction} onChange={(value) => patch({ tapAction: value })} />
          </Section>
          <Section title="Formato do progresso">
            <OptionRow title="Visual" options={[["bar", "Barra"], ["circle", "Círculo"], ["text", "Texto"], ["number", "Porcentagem"]]} value={widget.progressStyle} onChange={(value) => patch({ progressStyle: value as WidgetPreferences["progressStyle"] })} />
          </Section>
          <Card style={[styles.instanceCard, { borderColor: `${colors.primary}44` }]}> 
            <View style={styles.instanceHeader}>
              <CompanionMascot mascot="byte" size={48} />
              <View style={styles.flex}>
                <NexusText variant="title">Instâncias independentes</NexusText>
                <NexusText variant="caption" secondary>Depois de adicionar um widget, o Android abre uma configuração própria para ele.</NexusText>
              </View>
            </View>
            <NexusText secondary>
              Você pode manter um 4×2 com tarefas e outro 2×2 privado com foco. A configuração global acima vira o padrão para novas instâncias.
            </NexusText>
          </Card>
        </View>
      ) : null}

      <NexusText variant="caption" secondary style={styles.note}>
        Esta OTA melhora presets, dados e previews do motor já instalado. Novos layouts Android fora desse motor continuam exigindo outro APK.
      </NexusText>
    </Screen>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.title}>
        <NexusText variant="title">{title}</NexusText>
        {subtitle ? <NexusText variant="caption" secondary>{subtitle}</NexusText> : null}
      </View>
      {children}
    </View>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useNexus();
  return (
    <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
      <View style={styles.flex}>
        <NexusText variant="subtitle">{label}</NexusText>
        <NexusText variant="caption" secondary>{description}</NexusText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor="#FFF" />
    </View>
  );
}

function OptionRow({ title, options, value, onChange }: { title: string; options: (readonly [string | number, string])[]; value: string | number; onChange: (value: string | number) => void }) {
  return (
    <View style={styles.optionBlock}>
      <NexusText variant="caption" secondary>{title}</NexusText>
      <View style={styles.chips}>
        {options.map(([option, label]) => <ChoiceChip key={String(option)} label={label} selected={value === option} onPress={() => onChange(option)} />)}
      </View>
    </View>
  );
}

function ActionGrid({ value, onChange }: { value: WidgetTapAction; onChange: (value: WidgetTapAction) => void }) {
  const { colors } = useNexus();
  const actions: [WidgetTapAction, string, string][] = [
    ["today", "Hoje", "Abrir missão e tarefas"],
    ["brain", "Brain", "Conversar com Nexus ou Atlas"],
    ["focus", "Foco", "Abrir Focus OS"],
    ["capture", "Captura", "Criar tarefa rapidamente"],
    ["progress", "Progresso", "Abrir XP e estatísticas"],
  ];
  return (
    <View style={styles.actionGrid}>
      {actions.map(([action, label, description]) => (
        <Pressable
          key={action}
          onPress={() => onChange(action)}
          style={[
            styles.actionCard,
            {
              backgroundColor: value === action ? `${colors.primary}14` : colors.surface,
              borderColor: value === action ? colors.primary : colors.border,
            },
          ]}
        >
          <NexusText variant="subtitle">{label}</NexusText>
          <NexusText variant="caption" secondary>{description}</NexusText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  previewShell: { marginTop: 22, gap: 18, padding: 16 },
  previewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  tabs: { flexDirection: "row", padding: 5, borderRadius: 18, marginTop: 20, gap: 5 },
  tab: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  sectionStack: { gap: 30, marginTop: 28 },
  section: { gap: 12 },
  title: { gap: 4 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetCard: { width: "48%", minWidth: 150, flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  sizeCard: { width: 112, flexGrow: 1, minHeight: 82, borderRadius: 16, borderWidth: 1, padding: 12, justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggle: { minHeight: 72, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 13, gap: 12 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  styleCard: { width: "47%", minWidth: 145, flexGrow: 1, minHeight: 78, borderRadius: 16, borderWidth: 1, padding: 13, gap: 5 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorSwatch: { width: 38, height: 38, borderRadius: 12, borderWidth: 3 },
  optionBlock: { gap: 8 },
  mascots: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mascot: { minWidth: 92, flexGrow: 1, alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 16, padding: 10 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "47%", minWidth: 145, flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 5 },
  instanceCard: { gap: 12 },
  instanceHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  note: { textAlign: "center", marginTop: 30 },
});
