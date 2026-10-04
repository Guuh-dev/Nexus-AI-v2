import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import { Badge, IconButton } from "@/components/ui/Layout";
import { router, useFocusEffect } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { WidgetPreview } from "@/components/WidgetPreview";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import {
  CONTENT_BY_FAMILY,
  WIDGET_FAMILIES,
  createWidgetRenderSpec,
  defaultContentForFamily,
  isUtilityWidgetFamily,
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
  pixelWidgetCapabilities,
  utilityWidgetCapabilities,
  listAndroidWidgetInstances,
  saveAndroidWidgetInstance,
  updateAndroidWidget,
  type AndroidWidgetInstance,
} from "@/services/widget.service";
import type { CompanionMood, MascotId } from "@/types";
import { normalizeHexColor } from "@/utils/text";

export { RouteErrorBoundary as ErrorBoundary };

const STYLE_LABELS: Record<WidgetVisualStyle, { label: string; description: string }> = {
  nexus: { label: "Carvão", description: "Fundo escuro e acento oficial." },
  amoled: { label: "AMOLED", description: "Preto absoluto, sem brilho falso." },
  transparent: { label: "Transparente", description: "Sem placa: só conteúdo sobre o wallpaper." },
  pixel: { label: "Pixel", description: "Contorno quadrado retrô." },
  minimal: { label: "Minimal", description: "Superfície limpa e pouco ruído." },
};

const COLOR_PRESETS = ["#A99CFF", "#9FE4CE", "#F6C453", "#38BDF8", "#EC4899"];
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

const TABS = ["Família", "Conteúdo", "Visual", "Mascote"] as const;
type StudioTab = (typeof TABS)[number];

type SaveStatus = { kind: "idle" | "success" | "error" | "info"; message: string };

export default function WidgetStudioScreen() {
  const { data, colors, visuals, updatePreferences } = useNexus();
  const widget = data.preferences.widget;
  const baseConfiguration = useMemo(
    () => widgetConfigurationFromPreferences(widget, colors.primary),
    [colors.primary, widget],
  );
  const pixelPreview = Platform.OS === "web";
  const [pixelSupported, setPixelSupported] = useState(false);
  useEffect(() => { void pixelWidgetCapabilities().then(setPixelSupported); }, []);
  const [utilitySupported, setUtilitySupported] = useState(false);
  useEffect(() => { void utilityWidgetCapabilities().then(setUtilitySupported); }, []);
  const [tab, setTab] = useState<StudioTab>("Família");
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

  const families = WIDGET_FAMILIES.filter((item) => !isUtilityWidgetFamily(item.family) || utilitySupported || pixelPreview || selectedInstance?.family === item.family);
  const hasCompanion = draft.family !== "capture";
  const saveLabel = target === "default" ? "Salvar padrão" : `Salvar no ${familyLabel(draft.family)} #${target}`;
  const statusColor = status.kind === "error" ? colors.danger : status.kind === "success" ? colors.success : colors.textSecondary;

  return (
    <Screen
      maxWidth={640}
      footer={
        <View style={styles.footer}>
          {status.message ? <NexusText variant="caption" color={statusColor}>{status.message}</NexusText> : null}
          <NexusButton label={saveLabel} accessibilityLabel={`${saveLabel}: salvar e sincronizar`} onPress={() => { void save(); }} loading={saving} fullWidth />
        </View>
      }
    >
      <View style={styles.page}>
        <View style={styles.nav}>
          <IconButton icon="back" label="Voltar" onPress={() => router.back()} />
          <NexusText variant="subtitle" accessibilityRole="header" style={styles.flex}>Widget Studio</NexusText>
          <NexusText variant="caption" secondary>{instances.length} instalado{instances.length === 1 ? "" : "s"}</NexusText>
        </View>

        <View style={[styles.stage, { borderColor: colors.border }]}>
          <LinearGradient pointerEvents="none" colors={["#2A1F4D", "#141226", "#0F2A2A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <WidgetPreview spec={spec} caption={false} />
          <View style={styles.stageLabel}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <NexusText variant="caption" color="#D9DCE5">{familyLabel(spec.family)} {spec.size} · {STYLE_LABELS[spec.style].label}{spec.taskLimit ? ` · até ${spec.taskLimit} tarefas` : ""}</NexusText>
          </View>
        </View>
        {spec.style === "transparent" ? <NexusText variant="caption" secondary>Papel de parede ilustrativo. No celular aparece o seu.</NexusText> : null}

        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <NexusText variant="eyebrow" secondary>Editando</NexusText>
            <NexusButton label="Atualizar lista" variant="ghost" compact loading={refreshingInstances} onPress={() => void refreshInstances(true)} />
          </View>
          <View style={styles.chips}>
            <TargetChip title="Padrão" caption="novos widgets" selected={target === "default"} onPress={() => chooseTarget("default")} />
            {instances.map((instance) => (
              <TargetChip
                key={instance.appWidgetId}
                title={familyLabel(instance.family)}
                caption={`appWidgetId #${instance.appWidgetId}`}
                selected={target === instance.appWidgetId}
                onPress={() => chooseTarget(instance.appWidgetId)}
              />
            ))}
          </View>
          {instances.length === 0 ? (
            <NexusText variant="caption" secondary>Nenhum widget instalado ainda. Salve um padrão, adicione uma família pela tela inicial do Android e volte para personalizar a instância.</NexusText>
          ) : null}
        </View>

        <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          {TABS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}
            >
              <NexusText variant="caption" color={tab === item ? colors.text : colors.textSecondary} style={styles.tabLabel}>{item}</NexusText>
            </Pressable>
          ))}
        </View>

        {tab === "Família" ? (
          <View style={styles.block}>
            <View style={styles.familyGrid}>
              {families.map((item) => {
                const selected = draft.family === item.family;
                const locked = Boolean(selectedInstance && selectedInstance.family !== item.family);
                const [w, h] = item.size.split("x").map(Number) as [number, number];
                return (
                  <Pressable
                    key={item.family}
                    accessibilityRole="radio"
                    accessibilityLabel={`${item.label} ${item.size}`}
                    accessibilityState={{ selected, disabled: locked }}
                    onPress={() => {
                      if (locked) {
                        setStatus({ kind: "info", message: "O launcher fixa a família. Remova este widget e adicione a família desejada." });
                        return;
                      }
                      patchDraft({ family: item.family });
                    }}
                    style={[
                      styles.familyCard,
                      {
                        backgroundColor: selected ? `${colors.primary}14` : colors.surface,
                        borderColor: selected ? `${colors.primary}99` : colors.border,
                        borderRadius: visuals.cardRadius - 2,
                        opacity: locked ? 0.42 : 1,
                      },
                    ]}
                  >
                    <View style={styles.silhouetteBox}><View style={[styles.silhouette, { width: 11 * w, height: 11 * h, backgroundColor: selected ? colors.primary : colors.borderStrong }]} /></View>
                    <View style={styles.flex}>
                      <View style={styles.rowBetween}>
                        <NexusText variant="subtitle">{item.label}</NexusText>
                        {isUtilityWidgetFamily(item.family) ? <Badge label="Novo" color={colors.success} /> : null}
                      </View>
                      <NexusText variant="caption" secondary>{item.size} · {item.description}</NexusText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {selectedInstance ? <NexusText variant="caption" secondary>A família é definida pelo item escolhido no launcher. Para trocar, remova e adicione outra família.</NexusText> : null}
            {isUtilityWidgetFamily(draft.family) && target === "default" ? <NexusText variant="caption" secondary>Timer, Captura e Sequência são adicionados pela tela inicial. Salvar o padrão aqui guarda só o estilo visual.</NexusText> : null}
          </View>
        ) : null}

        {tab === "Conteúdo" ? (
          <View style={styles.block}>
            <Group title="O que mostrar">
              {CONTENT_BY_FAMILY[draft.family].map((option) => (
                <ChoiceChip key={option.value} label={option.label} selected={draft.content === option.value} onPress={() => patchDraft({ content: option.value })} />
              ))}
            </Group>
            {draft.family === "mini" ? (
              <Group title="Métrica no Mini">
                <ChoiceChip label="Mostrar métrica" selected={draft.showMetric !== false} onPress={() => patchDraft({ showMetric: draft.showMetric === false })} />
              </Group>
            ) : null}
            {draft.family !== "capture" && draft.family !== "timer" ? (
              <Group title="Ao tocar">
                {TAP_ACTIONS.map((item) => (
                  <ChoiceChip key={item.value} label={item.label} selected={draft.tapAction === item.value} onPress={() => patchDraft({ tapAction: item.value })} />
                ))}
              </Group>
            ) : <NexusText variant="caption" secondary>{draft.family === "capture" ? "Ao tocar, abre a captura rápida em Hoje." : "Ao tocar, abre o Foco."}</NexusText>}
            <Group title="Privacidade" caption="Protege missão, tarefas, métricas e falas na prévia e na tela inicial.">
              <ChoiceChip label="Conteúdo visível" selected={!draft.privateMode} onPress={() => patchDraft({ privateMode: false })} />
              <ChoiceChip label="Modo privado" selected={draft.privateMode} onPress={() => patchDraft({ privateMode: true })} />
            </Group>
          </View>
        ) : null}

        {tab === "Visual" ? (
          <View style={styles.block}>
            <Group title="Fundo">
              {WIDGET_VISUAL_STYLES.map((style) => {
                const selected = draft.style === style;
                return (
                  <Pressable
                    key={style}
                    accessibilityRole="radio"
                    accessibilityLabel={STYLE_LABELS[style].label}
                    accessibilityState={{ selected }}
                    onPress={() => patchDraft({ style, opacityPercent: style === "transparent" ? 0 : draft.opacityPercent === 0 ? 96 : draft.opacityPercent })}
                    style={[styles.styleCard, { backgroundColor: selected ? `${colors.primary}14` : colors.surface, borderColor: selected ? `${colors.primary}99` : colors.border }]}
                  >
                    <View style={[styles.styleSwatch, STYLE_SWATCH[style]]} />
                    <NexusText variant="caption" color={selected ? colors.primarySoft : colors.text} style={styles.tabLabel}>{STYLE_LABELS[style].label}</NexusText>
                  </Pressable>
                );
              })}
            </Group>
            <Group title="Cor de destaque">
              {COLOR_PRESETS.map((color) => (
                <Pressable
                  key={color}
                  accessibilityRole="radio"
                  accessibilityLabel={`Usar cor ${color}`}
                  accessibilityState={{ selected: draft.accentColor === color }}
                  onPress={() => { setAccentDraft(color); setAccentError(""); patchDraft({ accentColor: color }); }}
                  style={[styles.colorSwatch, { backgroundColor: color, borderColor: draft.accentColor === color ? colors.text : "transparent" }]}
                />
              ))}
            </Group>
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
            <Group title="Opacidade do fundo">
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
            </Group>
          </View>
        ) : null}

        {tab === "Mascote" ? (
          <View style={styles.block}>
            {!hasCompanion ? <NexusText secondary>O widget de Captura não mostra mascote.</NexusText> : (
              <>
                <Group title="Pixel Companions" caption={pixelPreview ? "Prévia web. Os widgets são instalados no Android." : pixelSupported ? "Cenários e controles disponíveis." : "Os novos cenários precisam de uma atualização Android. As opções compatíveis continuam disponíveis."}>
                  <ChoiceChip label="Mostrar mascote" selected={draft.showMascot !== false} onPress={() => patchDraft({ showMascot: draft.showMascot === false })} />
                </Group>
                <View style={styles.mascotRow}>
                  {(["nexus", "atlas"] as const).map((id) => {
                    const selected = draft.mascot === id;
                    return (
                      <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={id === "nexus" ? "Nexus" : "Atlas"} onPress={() => patchDraft({ mascot: id })} style={[styles.mascotCard, { backgroundColor: selected ? `${colors.primary}14` : colors.surface, borderColor: selected ? `${colors.primary}99` : colors.border }]}>
                        <CompanionMascot mascot={id} size={40} />
                        <View><NexusText variant="subtitle">{id === "nexus" ? "Nexus" : "Atlas"}</NexusText><NexusText variant="caption" secondary>{id === "nexus" ? "Copiloto" : "Professor"}</NexusText></View>
                      </Pressable>
                    );
                  })}
                </View>
                <Group title="Outros companions">
                  {MASCOTS.filter((item) => item.value !== "nexus" && item.value !== "atlas").map((item) => (
                    <ChoiceChip key={item.value} label={item.label} selected={draft.mascot === item.value} onPress={() => patchDraft({ mascot: item.value })} />
                  ))}
                </Group>
                <Group title="Personalidade">
                  {PERSONALITIES.map((item) => (
                    <ChoiceChip key={item.value} label={item.label} selected={draft.personality === item.value} onPress={() => patchDraft({ personality: item.value })} />
                  ))}
                </Group>
                <Group title="Falas">
                  {([["contextual", "Contextual"], ["silent", "Silencioso"]] as const).map(([value, label]) => (
                    <ChoiceChip key={value} label={label} selected={draft.speech === value} onPress={() => patchDraft({ speech: value })} />
                  ))}
                </Group>
                {(pixelSupported || pixelPreview) && (draft.family === "companion" || draft.family === "command") ? (
                  <Group title="Cenário">
                    {(["none", "desk", "garden", "night"] as const).map((scene) => (
                      <ChoiceChip key={scene} label={{ none: "Sem cenário", desk: "Escritório", garden: "Jardim", night: "Céu noturno" }[scene]} selected={(draft.scene ?? "none") === scene} onPress={() => patchDraft({ scene })} />
                    ))}
                  </Group>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        <NexusText variant="caption" secondary style={styles.note}>
          Para trocar a família ou ver as novas entradas pela primeira vez, pode ser necessário remover e adicionar o widget novamente. Os novos widgets, mascotes e cenários precisam de um novo APK; não chegam apenas por OTA.
        </NexusText>
      </View>
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

function TargetChip({ title, caption, selected, onPress }: { title: string; caption: string; selected: boolean; onPress: () => void }) {
  const { colors } = useNexus();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title} ${caption}`} onPress={onPress} style={[styles.target, { backgroundColor: selected ? `${colors.primary}1F` : colors.surfaceAlt, borderColor: selected ? `${colors.primary}99` : "transparent" }]}>
      <NexusText variant="caption" color={selected ? colors.primarySoft : colors.text} style={styles.tabLabel}>{title}</NexusText>
      <NexusText variant="caption" secondary style={styles.targetCaption}>{caption}</NexusText>
    </Pressable>
  );
}

function Group({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <NexusText variant="eyebrow" secondary>{title}</NexusText>
      {caption ? <NexusText variant="caption" secondary>{caption}</NexusText> : null}
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const STYLE_SWATCH: Record<WidgetVisualStyle, object> = {
  nexus: { backgroundColor: "#121419", borderColor: "#2A2D36" },
  amoled: { backgroundColor: "#000000", borderColor: "#17171B" },
  transparent: { backgroundColor: "transparent", borderColor: "#5A6070", borderStyle: "dashed" },
  pixel: { backgroundColor: "#12101B", borderColor: "#7963A0", borderRadius: 3 },
  minimal: { backgroundColor: "#101012", borderColor: "#27272B" },
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 18, paddingBottom: 12 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12 },
  stage: { borderRadius: 20, borderWidth: 1, overflow: "hidden", paddingHorizontal: 14, paddingTop: 22, paddingBottom: 14, gap: 14, alignItems: "center" },
  stageLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { borderRadius: 4, height: 8, width: 8 },
  block: { gap: 14 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  target: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: "center" },
  targetCaption: { fontSize: 11, lineHeight: 14 },
  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3, gap: 2 },
  tab: { flex: 1, minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  tabLabel: { fontWeight: "600" },
  familyGrid: { gap: 8 },
  familyCard: { borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  silhouetteBox: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  silhouette: { borderRadius: 4 },
  group: { gap: 8 },
  styleCard: { borderWidth: 1, borderRadius: 12, padding: 10, alignItems: "center", gap: 8, minWidth: 88 },
  styleSwatch: { width: 44, height: 30, borderRadius: 8, borderWidth: 1 },
  colorSwatch: { borderRadius: 18, borderWidth: 3, height: 36, width: 36 },
  mascotRow: { flexDirection: "row", gap: 8 },
  mascotCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 10 },
  footer: { gap: 8 },
  note: { textAlign: "center" },
});
