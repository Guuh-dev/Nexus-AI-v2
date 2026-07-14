import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
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
import {
  CONTENT_BY_FAMILY,
  WIDGET_FAMILIES,
  createWidgetRenderSpec,
  defaultContentForFamily,
  normalizeWidgetContent,
  widgetConfigurationFromPreferences,
  widgetPreferencesPatchFromConfiguration,
  type WidgetFamily,
  type WidgetCoreTapAction,
  type WidgetInstanceConfiguration,
} from "@/features/widget/render-spec";
import {
  WIDGET_VISUAL_STYLES,
  type WidgetVisualStyle,
} from "@/features/widgets/widget-style";
import { useNexus } from "@/providers/NexusProvider";
import {
  listAndroidWidgetInstances,
  saveAndroidWidgetInstance,
  updateAndroidWidget,
  type AndroidWidgetInstance,
} from "@/services/widget.service";
import type { CompanionMood, MascotId } from "@/types";
import { normalizeHexColor } from "@/utils/text";

export { RouteErrorBoundary as ErrorBoundary };

const STYLE_LABELS: Record<WidgetVisualStyle, { label: string; description: string }> = {
  nexus: { label: "Nexus", description: "Fundo escuro e acento oficial." },
  amoled: { label: "AMOLED", description: "Preto absoluto, sem brilho falso." },
  transparent: { label: "Transparente", description: "Sem placa: só conteúdo sobre o wallpaper." },
  pixel: { label: "Pixel", description: "Contorno quadrado retrô." },
  minimal: { label: "Minimal", description: "Superfície limpa e pouco ruído." },
};

const COLOR_PRESETS = ["#8B5CF6", "#38BDF8", "#10B981", "#F59E0B", "#EC4899"];
const OPACITY_OPTIONS = [
  { value: 100, label: "Sólido" },
  { value: 96, label: "Padrão 96%" },
  { value: 85, label: "85%" },
  { value: 70, label: "70%" },
  { value: 0, label: "Transparente" },
] as const;

const PERSONALITIES: { value: CompanionMood; label: string }[] = [
  { value: "happy", label: "Feliz" },
  { value: "playful", label: "Zoeiro" },
  { value: "motivational", label: "Motivador" },
  { value: "serious", label: "Sério" },
  { value: "strict", label: "Exigente" },
  { value: "calm", label: "Calmo" },
  { value: "quiet", label: "Quieto" },
];

const TAP_ACTIONS: { value: WidgetCoreTapAction; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "brain", label: "Brain" },
  { value: "focus", label: "Focus" },
  { value: "progress", label: "Progresso" },
];

const MASCOTS: { value: MascotId; label: string }[] = [
  { value: "nexus", label: "Nexus" },
  { value: "atlas", label: "Atlas" },
  { value: "byte", label: "Byte" },
  { value: "nova", label: "Nova" },
  { value: "pulse", label: "Pulse" },
  { value: "orbit", label: "Orbit" },
  { value: "ember", label: "Ember" },
];

type SaveStatus = { kind: "idle" | "success" | "error" | "info"; message: string };

export default function WidgetStudioScreen() {
  const { data, colors, updatePreferences } = useNexus();
  const widget = data.preferences.widget;
  const baseConfiguration = useMemo(
    () => widgetConfigurationFromPreferences(widget, colors.primary),
    [colors.primary, widget],
  );
  const [draft, setDraft] = useState<WidgetInstanceConfiguration>(baseConfiguration);
  const [target, setTarget] = useState<"default" | number>("default");
  const [instances, setInstances] = useState<AndroidWidgetInstance[]>([]);
  const [accentDraft, setAccentDraft] = useState(baseConfiguration.accentColor);
  const [accentError, setAccentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshingInstances, setRefreshingInstances] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle", message: "" });
  const openingData = useRef(data);

  const refreshInstances = useCallback(async (manual = false) => {
    setRefreshingInstances(true);
    try {
      setInstances(await listAndroidWidgetInstances());
      if (manual) setStatus({ kind: "info", message: "Lista de widgets atualizada." });
    } finally {
      setRefreshingInstances(false);
    }
  }, []);

  useEffect(() => {
    // Opening Studio performs one payload sync. Subsequent focus/AppState
    // refreshes only reload instance metadata and never redraw twice.
    void updateAndroidWidget(openingData.current).then(() => refreshInstances());
  }, [refreshInstances]);

  useFocusEffect(useCallback(() => {
    void refreshInstances();
  }, [refreshInstances]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshInstances();
    });
    return () => subscription.remove();
  }, [refreshInstances]);

  const selectedInstance = target === "default"
    ? undefined
    : instances.find((instance) => instance.appWidgetId === target);
  const spec = useMemo(
    () => createWidgetRenderSpec(widget, colors, draft),
    [colors, draft, widget],
  );

  const patchDraft = (patch: Partial<WidgetInstanceConfiguration>) => {
    setDraft((current) => {
      const nextFamily = patch.family ?? current.family;
      const familyChanged = nextFamily !== current.family;
      const next = {
        ...current,
        ...patch,
        family: nextFamily,
        content: normalizeWidgetContent(
          nextFamily,
          familyChanged ? defaultContentForFamily(nextFamily) : patch.content ?? current.content,
        ),
      };
      return next;
    });
    setStatus({ kind: "idle", message: "" });
  };

  const chooseTarget = (nextTarget: "default" | number) => {
    setTarget(nextTarget);
    if (nextTarget === "default") {
      setDraft(baseConfiguration);
      setAccentDraft(baseConfiguration.accentColor);
      setStatus({ kind: "info", message: "Editando o padrão usado por widgets sem configuração própria." });
      return;
    }
    const instance = instances.find((item) => item.appWidgetId === nextTarget);
    if (!instance) return;
    const next = mergeInstanceConfiguration(baseConfiguration, instance);
    setDraft(next);
    setAccentDraft(next.accentColor);
    setStatus({ kind: "info", message: `${familyLabel(instance.family)} #${instance.appWidgetId}: alterações ficam somente nesta instância.` });
  };

  const applyPreset = (presetId: Parameters<typeof applyWidgetPreset>[1]) => {
    const presetPreferences = applyWidgetPreset(widget, presetId);
    const presetConfiguration = widgetConfigurationFromPreferences(presetPreferences, colors.primary);
    const next = selectedInstance
      ? {
          ...presetConfiguration,
          family: selectedInstance.family,
          content: defaultContentForFamily(selectedInstance.family),
        }
      : presetConfiguration;
    setDraft(next);
    setAccentDraft(next.accentColor);
    setStatus({ kind: "idle", message: "" });
  };

  const commitAccent = (): string | null => {
    const normalized = normalizeHexColor(accentDraft, "");
    if (!normalized) {
      setAccentError("Use uma cor hexadecimal completa, como #8B5CF6.");
      return null;
    }
    setAccentError("");
    setAccentDraft(normalized);
    patchDraft({ accentColor: normalized });
    return normalized;
  };

  const save = async () => {
    const normalizedAccent = normalizeHexColor(accentDraft, "");
    if (!normalizedAccent) {
      setAccentError("Use uma cor hexadecimal completa, como #8B5CF6.");
      return;
    }
    const configuration = { ...draft, accentColor: normalizedAccent };
    setDraft(configuration);
    setAccentDraft(normalizedAccent);
    setAccentError("");
    setSaving(true);
    setStatus({ kind: "info", message: "Salvando e notificando o Android…" });

    try {
      if (target === "default") {
        const widgetPatch = {
          ...widgetPreferencesPatchFromConfiguration(configuration),
          preset: "custom" as const,
        };
        const result = await updatePreferences({ widget: widgetPatch });
        if (!result) {
          setStatus({ kind: "error", message: "Não foi possível persistir o padrão do widget." });
          return;
        }
        if (!result.updated) {
          setStatus({
            kind: result.supported ? "error" : "info",
            message: result.error ?? (result.supported
              ? "Padrão salvo no app, mas o Android não confirmou o redesenho."
              : "Padrão salvo no app. O redesenho nativo só pode ser confirmado no Android."),
          });
        } else {
          setStatus({
            kind: "success",
            message: `Padrão salvo e ${result.instanceCount} widget${result.instanceCount === 1 ? "" : "s"} atualizado${result.instanceCount === 1 ? "" : "s"}.`,
          });
        }
      } else {
        const saved = await saveAndroidWidgetInstance(target, configuration);
        if (!saved) {
          setStatus({ kind: "error", message: "Não foi possível salvar esta instância." });
        } else {
          setStatus({ kind: "success", message: `Widget #${target} salvo, sincronizado e redesenhado.` });
        }
      }
      setInstances(await listAndroidWidgetInstances());
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Não foi possível concluir a sincronização.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen maxWidth={820}>
      <View style={styles.header}>
        <NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} />
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>WIDGET STUDIO 3.0</NexusText>
          <NexusText variant="display">Cinco widgets. Opções que funcionam.</NexusText>
        </View>
        <CompanionMascot mascot="byte" size={56} />
      </View>
      <NexusText secondary>
        O preview e o Android usam o mesmo WidgetRenderSpec: família, conteúdo, limite de tarefas, cores, Companion, ação e estado vazio.
      </NexusText>

      <Card style={[styles.previewShell, { borderColor: `${colors.primary}55` }]}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <NexusText variant="mono" color={colors.primarySoft}>PREVIEW HONESTO</NexusText>
            <NexusText variant="caption" secondary>{familyLabel(spec.family)} {spec.size} • {STYLE_LABELS[spec.style].label} • limite de {spec.taskLimit} tarefas</NexusText>
          </View>
          <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
        </View>
        <WidgetPreview spec={spec} />
      </Card>

      <Section title="Onde salvar" subtitle="O padrão alimenta novos widgets. Uma instância mantém sua própria configuração por appWidgetId.">
        <NexusButton
          label="Atualizar widgets instalados"
          variant="ghost"
          compact
          loading={refreshingInstances}
          onPress={() => void refreshInstances(true)}
        />
        <View style={styles.chips}>
          <ChoiceChip label="Padrão" selected={target === "default"} onPress={() => chooseTarget("default")} />
          {instances.map((instance) => (
            <ChoiceChip
              key={instance.appWidgetId}
              label={`${familyLabel(instance.family)} #${instance.appWidgetId}`}
              selected={target === instance.appWidgetId}
              onPress={() => chooseTarget(instance.appWidgetId)}
            />
          ))}
        </View>
        {instances.length === 0 ? (
          <Card style={[styles.infoCard, { borderColor: colors.border }]}>
            <NexusText variant="subtitle">Nenhum widget instalado ainda</NexusText>
            <NexusText variant="caption" secondary>Salve um padrão, adicione uma das cinco famílias pela tela inicial do Android e volte para personalizar a instância.</NexusText>
          </Card>
        ) : null}
      </Section>

      <Section title="Comece por uma família" subtitle="Cada preset corresponde a uma família Android real.">
        <View style={styles.presetGrid}>
          {WIDGET_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => applyPreset(preset.id)}
              style={({ pressed }) => [
                styles.presetCard,
                {
                  backgroundColor: spec.size === preset.recommendedSize ? `${colors.primary}16` : colors.surface,
                  borderColor: spec.size === preset.recommendedSize ? colors.primary : colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <NexusText variant="title">{preset.icon} {preset.label}</NexusText>
              <NexusText variant="caption" secondary>{preset.description}</NexusText>
              <NexusText variant="mono" color={colors.primarySoft}>{preset.recommendedSize}</NexusText>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Família" subtitle={selectedInstance ? "A família é definida pelo item escolhido no launcher. Para trocar, remova e adicione outra família." : "Somente os cinco tamanhos úteis ficam disponíveis."}>
        <View style={styles.familyGrid}>
          {WIDGET_FAMILIES.map((item) => {
            const selected = draft.family === item.family;
            const locked = Boolean(selectedInstance && selectedInstance.family !== item.family);
            return (
              <Pressable
                key={item.family}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: locked }}
                onPress={() => {
                  if (selectedInstance && selectedInstance.family !== item.family) {
                    setStatus({ kind: "info", message: "O launcher fixa a família. Remova este widget e adicione a família desejada." });
                    return;
                  }
                  patchDraft({ family: item.family });
                }}
                style={[
                  styles.familyCard,
                  {
                    backgroundColor: selected ? `${colors.primary}16` : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: locked ? 0.45 : 1,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <NexusText variant="title">{item.label}</NexusText>
                  <NexusText variant="mono" color={colors.primarySoft}>{item.size}</NexusText>
                </View>
                <NexusText variant="caption" secondary>{item.description}</NexusText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Conteúdo" subtitle="As opções mudam conforme o espaço real da família.">
        <View style={styles.chips}>
          {CONTENT_BY_FAMILY[draft.family].map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={draft.content === option.value}
              onPress={() => patchDraft({ content: option.value })}
            />
          ))}
        </View>
      </Section>

      <Section title="Visual" subtitle="Nexus, AMOLED, transparente, Pixel e Minimal são reproduzíveis pelo RemoteViews.">
        <View style={styles.styleGrid}>
          {WIDGET_VISUAL_STYLES.map((style) => (
            <Pressable
              key={style}
              onPress={() => patchDraft({
                style,
                opacityPercent: style === "transparent" ? 0 : draft.opacityPercent === 0 ? 96 : draft.opacityPercent,
              })}
              style={[
                styles.styleCard,
                {
                  backgroundColor: draft.style === style ? `${colors.primary}16` : colors.surface,
                  borderColor: draft.style === style ? colors.primary : colors.border,
                },
              ]}
            >
              <NexusText variant="subtitle">{STYLE_LABELS[style].label}</NexusText>
              <NexusText variant="caption" secondary>{STYLE_LABELS[style].description}</NexusText>
            </Pressable>
          ))}
        </View>

        <View style={styles.optionBlock}>
          <NexusText variant="caption" secondary>Transparência do fundo</NexusText>
          <View style={styles.chips}>
            {OPACITY_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                selected={draft.opacityPercent === option.value}
                onPress={() => patchDraft({
                  opacityPercent: option.value,
                  style: option.value === 0 ? "transparent" : draft.style === "transparent" ? "nexus" : draft.style,
                })}
              />
            ))}
          </View>
        </View>

        <View style={styles.optionBlock}>
          <NexusText variant="caption" secondary>Cor de destaque</NexusText>
          <View style={styles.colorRow}>
            {COLOR_PRESETS.map((color) => (
              <Pressable
                key={color}
                accessibilityLabel={`Usar cor ${color}`}
                onPress={() => {
                  setAccentDraft(color);
                  setAccentError("");
                  patchDraft({ accentColor: color });
                }}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color, borderColor: draft.accentColor === color ? colors.text : "transparent" },
                ]}
              />
            ))}
          </View>
          <Field
            label="Cor personalizada"
            value={accentDraft}
            onChangeText={(value) => { setAccentDraft(value.toUpperCase()); setAccentError(""); }}
            onSubmitEditing={commitAccent}
            onBlur={commitAccent}
            maxLength={7}
            placeholder="#8B5CF6"
            error={accentError}
            autoCapitalize="characters"
          />
        </View>
      </Section>

      {(draft.family === "mini" || draft.family === "companion" || draft.family === "command") ? (
        <Section title="Companion" subtitle="Mascote e personalidade são salvos por instância.">
          <View style={styles.chips}>
            {MASCOTS.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={draft.mascot === item.value}
                onPress={() => patchDraft({ mascot: item.value })}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {PERSONALITIES.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={draft.personality === item.value}
                onPress={() => patchDraft({ personality: item.value })}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {([
              ["contextual", "Contextual"],
              ["silent", "Silencioso"],
            ] as const).map(([value, label]) => (
              <ChoiceChip
                key={value}
                label={label}
                selected={draft.speech === value}
                onPress={() => patchDraft({ speech: value })}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Privacidade" subtitle="Protege missão, tarefas, métricas e falas tanto no preview quanto na tela inicial.">
        <View style={styles.chips}>
          <ChoiceChip
            label="Conteúdo visível"
            selected={!draft.privateMode}
            onPress={() => patchDraft({ privateMode: false })}
          />
          <ChoiceChip
            label="Modo privado"
            selected={draft.privateMode}
            onPress={() => patchDraft({ privateMode: true })}
          />
        </View>
      </Section>

      <Section title="Ao tocar" subtitle="A mesma ação é usada no preview do contrato e no PendingIntent nativo.">
        <View style={styles.chips}>
          {TAP_ACTIONS.map((item) => (
            <ChoiceChip
              key={item.value}
              label={item.label}
              selected={draft.tapAction === item.value}
              onPress={() => patchDraft({ tapAction: item.value })}
            />
          ))}
        </View>
      </Section>

      <Card style={[
        styles.saveCard,
        {
          borderColor: status.kind === "error" ? colors.danger : status.kind === "success" ? colors.success : `${colors.primary}55`,
          backgroundColor: status.kind === "success" ? `${colors.success}0D` : colors.surface,
        },
      ]}>
        <View style={styles.flex}>
          <NexusText variant="title">{target === "default" ? "Salvar como padrão" : `Salvar ${familyLabel(draft.family)} #${target}`}</NexusText>
          <NexusText variant="caption" color={status.kind === "error" ? colors.danger : status.kind === "success" ? colors.success : colors.textSecondary}>
            {status.message || "Persistir, sincronizar payload, notificar provider e redesenhar agora."}
          </NexusText>
        </View>
        <NexusButton label="Salvar e sincronizar" onPress={() => { void save(); }} loading={saving} />
      </Card>

      <NexusText variant="caption" secondary style={styles.note}>
        Para trocar a família ou ver as cinco entradas pela primeira vez, pode ser necessário remover e adicionar o widget novamente. Alterações em Kotlin/XML exigem um novo APK; não chegam apenas por OTA.
      </NexusText>
    </Screen>
  );
}

function mergeInstanceConfiguration(
  base: WidgetInstanceConfiguration,
  instance: AndroidWidgetInstance,
): WidgetInstanceConfiguration {
  const family = instance.family;
  return {
    ...base,
    ...instance.config,
    family,
    content: normalizeWidgetContent(family, instance.config?.content ?? defaultContentForFamily(family)),
  };
}

function familyLabel(family: WidgetFamily): string {
  return WIDGET_FAMILIES.find((item) => item.family === family)?.label ?? family;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <NexusText variant="title">{title}</NexusText>
        {subtitle ? <NexusText variant="caption" secondary>{subtitle}</NexusText> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
  previewShell: { gap: 18, marginTop: 22, padding: 16 },
  liveDot: { borderRadius: 6, height: 10, width: 10 },
  section: { gap: 13, marginTop: 30 },
  sectionTitle: { gap: 4 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoCard: { gap: 5 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetCard: { borderRadius: 18, borderWidth: 1, flexGrow: 1, gap: 7, minWidth: 145, padding: 14, width: "31%" },
  familyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  familyCard: { borderRadius: 17, borderWidth: 1, flexGrow: 1, gap: 6, minHeight: 92, minWidth: 150, padding: 14, width: "31%" },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  styleCard: { borderRadius: 16, borderWidth: 1, flexGrow: 1, gap: 5, minHeight: 80, minWidth: 145, padding: 13, width: "30%" },
  optionBlock: { gap: 9, marginTop: 4 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorSwatch: { borderRadius: 12, borderWidth: 3, height: 40, width: 40 },
  saveCard: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 32 },
  note: { marginTop: 22, textAlign: "center" },
});
