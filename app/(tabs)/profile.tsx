import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { router } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PixelMascot } from "@/components/PixelMascot";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";
import { pickBackupJson, shareBackupJson } from "@/services/backup.service";
import { configureDailyReminder } from "@/services/notification.service";
import {
  getIntelligenceStatus,
  type IntelligenceStatus,
} from "@/services/status.service";
import {
  applyNexusUpdate,
  checkForNexusUpdate,
  getNexusUpdateInfo,
  type NexusUpdateInfo,
} from "@/services/update.service";
import type { Profile, ThemeId, Weekday } from "@/types";
import { calculateLevel } from "@/utils/levels";
import { normalizeHexColor } from "@/utils/text";
import { OTA_RELEASE } from "@/constants/release";

export { RouteErrorBoundary as ErrorBoundary };

type ProfileArea = "central" | "perfil" | "visual" | "sistema" | "dados";

const themes: {
  id: ThemeId;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    id: "nexus",
    label: "Nexus Purple",
    description: "Comando premium roxo e preto",
    color: "#8B5CF6",
  },
  {
    id: "amoled",
    label: "AMOLED",
    description: "Preto puro e contraste máximo",
    color: "#9B7BFF",
  },
  {
    id: "oneui",
    label: "One UI Future",
    description: "Limpo, azul e arredondado",
    color: "#7C9CFF",
  },
  {
    id: "hud",
    label: "Mission HUD",
    description: "Terminal verde de execução",
    color: "#2DD4A8",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Ciano e energia sutil",
    color: "#22D3EE",
  },
  {
    id: "ocean",
    label: "Deep Ocean",
    description: "Azul profundo e calmo",
    color: "#38BDF8",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Laranja de operação",
    color: "#F97316",
  },
  {
    id: "rose",
    label: "Rose Protocol",
    description: "Rosa futurista controlado",
    color: "#EC4899",
  },
  {
    id: "monochrome",
    label: "Monochrome",
    description: "Preto, branco e silêncio",
    color: "#E4E4E7",
  },
  {
    id: "custom",
    label: "Personalizado",
    description: "Sua própria cor de destaque",
    color: "#F472B6",
  },
];

const profileDays: { value: Weekday; label: string }[] = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

const areaMeta: Record<ProfileArea, { label: string; description: string }> = {
  central: { label: "Central", description: "Atalhos e estado do sistema" },
  perfil: {
    label: "Perfil",
    description: "Missão, rotina e preferências pessoais",
  },
  visual: { label: "Visual", description: "Tema, movimento e identidade" },
  sistema: { label: "Sistema", description: "IA, lembretes e diagnóstico" },
  dados: { label: "Dados", description: "Backup, privacidade e reset" },
};

export default function ProfileScreen() {
  const {
    data,
    colors,
    lastAssistantMeta,
    updateProfile,
    updatePreferences,
    exportBackup,
    importBackup,
    resetToday,
    resetAll,
  } = useNexus();
  const profile = data.profile;
  const [area, setArea] = useState<ProfileArea>("central");
  const [name, setName] = useState(profile?.name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [goal, setGoal] = useState(profile?.mainGoal ?? "");
  const [minutes, setMinutes] = useState(
    String(profile?.availableMinutes ?? 120),
  );
  const [schedule, setSchedule] = useState(profile?.schedule ?? "");
  const [notificationTime, setNotificationTime] = useState(
    data.preferences.notificationTime,
  );
  const [customAccent, setCustomAccent] = useState(
    data.preferences.customAccent,
  );
  const [status, setStatus] = useState<IntelligenceStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [updateInfo, setUpdateInfo] =
    useState<NexusUpdateInfo>(getNexusUpdateInfo);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [resetTodayOpen, setResetTodayOpen] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [message, setMessage] = useState("");
  const level = calculateLevel(data.progress.totalXp);
  const intelligenceOnline = Boolean(
    status?.configured && status.assistantAvailable !== false,
  );

  const refreshStatus = (deep = false) => {
    const controller = new AbortController();
    setStatusLoading(true);
    void getIntelligenceStatus(controller.signal, deep)
      .then(setStatus)
      .finally(() => setStatusLoading(false));
    return controller;
  };

  useEffect(() => {
    const controller = refreshStatus(false);
    return () => controller.abort();
  }, []);

  if (!profile) return null;

  const saveProfile = () => {
    const ok = updateProfile({
      name: name.trim(),
      nickname: nickname.trim(),
      mainGoal: goal.trim(),
      availableMinutes: Number(minutes),
      schedule: schedule.trim(),
    });
    setMessage(
      ok
        ? "Perfil salvo."
        : "Revise os campos. A meta precisa ter pelo menos 10 caracteres.",
    );
  };

  const applyCustomAccent = () => {
    const normalized = normalizeHexColor(customAccent);
    if (!normalized) {
      setMessage("Use uma cor hexadecimal válida, como #8B5CF6.");
      return;
    }
    setCustomAccent(normalized);
    updatePreferences({ customAccent: normalized });
    setMessage("Cor personalizada aplicada.");
  };

  const setReminder = async (enabled: boolean) => {
    if (enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) {
      setMessage("Use um horário válido no formato HH:MM.");
      return;
    }
    const result = await configureDailyReminder(enabled, notificationTime);
    updatePreferences({
      notificationEnabled: result.enabled,
      notificationTime,
    });
    if (result.reason) Alert.alert("Lembrete do Nexus", result.reason);
  };

  const checkUpdates = async () => {
    setUpdateBusy(true);
    try {
      const result = await checkForNexusUpdate();
      setUpdateInfo(result.info);
      setUpdateAvailable(result.available || result.rollbackAvailable);
      if (!result.info.enabled) {
        setMessage(
          "Atualizações OTA só funcionam no APK de release, não no Expo Go ou preview de desenvolvimento.",
        );
      } else if (result.available) {
        setMessage("Atualização encontrada. Toque em baixar e reiniciar.");
      } else if (result.rollbackAvailable) {
        setMessage("Uma recuperação para a versão estável está disponível.");
      } else {
        setMessage(
          "Seu Nexus já está na atualização mais recente deste canal.",
        );
      }
    } catch {
      setMessage(
        "Não foi possível verificar atualizações agora. Confira a internet e tente novamente.",
      );
    } finally {
      setUpdateBusy(false);
    }
  };

  const installUpdate = async () => {
    setUpdateBusy(true);
    try {
      const result = await applyNexusUpdate();
      if (result === "unchanged") {
        setUpdateAvailable(false);
        setMessage("Nenhuma atualização nova foi baixada.");
      }
    } catch {
      setMessage(
        "A atualização não pôde ser aplicada. O app atual continua intacto.",
      );
      setUpdateBusy(false);
    }
  };

  const exportData = async () => {
    try {
      await shareBackupJson(exportBackup());
      setMessage("Backup preparado com sucesso.");
    } catch {
      setMessage("Não foi possível exportar o backup neste dispositivo.");
    }
  };

  const importData = async () => {
    try {
      const json = await pickBackupJson();
      if (!json) return;
      await importBackup(json);
      setMessage("Backup importado com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "O arquivo não é um backup válido.",
      );
    }
  };

  return (
    <>
      <Screen>
        <View style={styles.profileHeader}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: `${colors.primary}20`,
                borderColor: `${colors.primary}55`,
              },
            ]}
          >
            <PixelMascot state="idle" size={62} />
          </View>
          <View style={styles.flex}>
            <NexusText variant="display">{profile.nickname}</NexusText>
            <NexusText variant="mono" color={colors.primarySoft}>
              NÍVEL {level.level} • {level.title.toUpperCase()}
            </NexusText>
            <NexusText variant="caption" secondary>
              {data.progress.totalXp} XP acumulado
            </NexusText>
          </View>
        </View>

        <View
          style={[
            styles.areaNav,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {(Object.keys(areaMeta) as ProfileArea[]).map((item) => (
            <ChoiceChip
              key={item}
              label={areaMeta[item].label}
              selected={area === item}
              onPress={() => setArea(item)}
            />
          ))}
        </View>
        <NexusText variant="caption" secondary>
          {areaMeta[area].description}
        </NexusText>

        {area === "central" ? (
          <>
            <Section
              title="Centrais do Nexus"
              subtitle="Cada sistema tem sua própria área para não virar um painel embolado."
            >
              <View style={styles.controlGrid}>
                <ControlCard
                  title="Command Center"
                  description="Layout, ordem e densidade"
                  icon="▦"
                  onPress={() => router.push("/customize")}
                />
                <ControlCard
                  title="Widget Studio"
                  description="Tamanhos, conteúdo e visual"
                  icon="◇"
                  onPress={() => router.push("/widget-studio")}
                />
                <ControlCard
                  title="Operações"
                  description="Projetos com fases e prazo"
                  icon="★"
                  onPress={() => router.push("/operations")}
                />
                <ControlCard
                  title="Hábitos"
                  description="Rotinas com recuperação"
                  icon="♨"
                  onPress={() => router.push("/habits")}
                />
                <ControlCard
                  title="Money Mission"
                  description="Receita, clientes e follow-ups"
                  icon="R$"
                  onPress={() => router.push("/finance")}
                />
                <ControlCard
                  title="Semana"
                  description="Capacidade em sete dias"
                  icon="▥"
                  onPress={() => router.push("/week")}
                />
                <ControlCard
                  title="Diagnóstico"
                  description="Rever evolução e Professor"
                  icon="✦"
                  onPress={() => router.push("/discovery")}
                />
              </View>
            </Section>

            <Section
              title="Estado do sistema"
              subtitle="Um resumo rápido antes de abrir configurações avançadas."
            >
              <Card style={styles.statusCard}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: intelligenceOnline
                        ? colors.success
                        : status
                          ? colors.warning
                          : colors.textSecondary,
                    },
                  ]}
                />
                <View style={styles.flex}>
                  <NexusText variant="subtitle">
                    {statusLoading
                      ? "Verificando inteligência..."
                      : intelligenceOnline
                        ? "Nexus Brain online"
                        : status?.configured
                          ? "Backend antigo detectado"
                          : status
                            ? "Modo local ativo"
                            : "Backend não alcançado"}
                  </NexusText>
                  <NexusText variant="caption" secondary>
                    {intelligenceOnline
                      ? `API ${status?.apiVersion ?? "compatível"} • ${status?.primaryModel}`
                      : status
                        ? "Seu plano e captura continuam disponíveis pelo fallback local."
                        : "Confira a URL do backend ou o deploy do Render na aba Sistema."}
                  </NexusText>
                </View>
              </Card>
              <View style={styles.summaryGrid}>
                <SummaryMetric
                  label="Chats"
                  value={String(data.brain.threads.length)}
                />
                <SummaryMetric
                  label="Roadmaps"
                  value={String(data.learning.roadmaps.length)}
                />
                <SummaryMetric
                  label="Operações"
                  value={String(
                    data.operations.filter((item) => item.status === "active")
                      .length,
                  )}
                />
                <SummaryMetric
                  label="Hábitos"
                  value={String(data.habits.length)}
                />
              </View>
            </Section>
          </>
        ) : null}

        {area === "perfil" ? (
          <Section
            title="Seu comando"
            subtitle="Essas respostas guiam planejamento, Brain e Professor."
          >
            <Field
              label="Nome"
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <Field
              label="Como o Nexus chama você"
              value={nickname}
              onChangeText={setNickname}
              maxLength={40}
            />
            <Field
              label="Grande missão"
              value={goal}
              onChangeText={setGoal}
              multiline
              maxLength={600}
            />
            <Field
              label="Minutos disponíveis por dia"
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Field
              label="Rotina"
              value={schedule}
              onChangeText={setSchedule}
              multiline
              maxLength={600}
            />
            <View style={styles.choiceGroup}>
              <NexusText variant="caption" secondary>
                Dias ativos
              </NexusText>
              <View style={styles.chips}>
                {profileDays.map((day) => {
                  const selected = profile.activeDays.includes(day.value);
                  const nextDays = selected
                    ? profile.activeDays.filter((item) => item !== day.value)
                    : ([...profile.activeDays, day.value].sort() as Weekday[]);
                  return (
                    <ChoiceChip
                      key={day.value}
                      label={day.label}
                      selected={selected}
                      onPress={() =>
                        nextDays.length > 0 &&
                        updateProfile({ activeDays: nextDays })
                      }
                    />
                  );
                })}
              </View>
            </View>
            <ProfileChoice
              title="Máximo diário"
              value={profile.maxDailyTasks}
              options={[
                [2, "2 tarefas"],
                [3, "3 tarefas"],
                [4, "4 tarefas"],
                [5, "5 tarefas"],
              ]}
              onChange={(value) =>
                updateProfile({ maxDailyTasks: Number(value) })
              }
            />
            <ProfileChoice
              title="Intensidade"
              value={profile.intensity}
              options={[
                ["leve", "Leve"],
                ["equilibrado", "Equilibrado"],
                ["intenso", "Intenso"],
              ]}
              onChange={(value) =>
                updateProfile({ intensity: value as Profile["intensity"] })
              }
            />
            <ProfileChoice
              title="Tom do assistente"
              value={profile.assistantTone}
              options={[
                ["direto", "Direto"],
                ["parceiro", "Parceiro"],
                ["treinador", "Treinador"],
              ]}
              onChange={(value) =>
                updateProfile({
                  assistantTone: value as Profile["assistantTone"],
                })
              }
            />
            <NexusButton
              label="Salvar perfil"
              onPress={saveProfile}
              fullWidth
            />
          </Section>
        ) : null}

        {area === "visual" ? (
          <>
            <Section
              title="Temas"
              subtitle="Mude o clima inteiro sem alterar seus dados."
            >
              <View style={styles.themeGrid}>
                {themes.map((theme) => (
                  <Pressable
                    key={theme.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: data.preferences.theme === theme.id,
                    }}
                    onPress={() => updatePreferences({ theme: theme.id })}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor:
                          data.preferences.theme === theme.id
                            ? `${theme.color}18`
                            : colors.surface,
                        borderColor:
                          data.preferences.theme === theme.id
                            ? theme.color
                            : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeDot,
                        { backgroundColor: theme.color },
                      ]}
                    />
                    <NexusText variant="subtitle">{theme.label}</NexusText>
                    <NexusText variant="caption" secondary>
                      {theme.description}
                    </NexusText>
                  </Pressable>
                ))}
              </View>
              {data.preferences.theme === "custom" ? (
                <Card style={styles.customColorCard}>
                  <Field
                    label="Cor hexadecimal"
                    value={customAccent}
                    onChangeText={setCustomAccent}
                    maxLength={7}
                    placeholder="#8B5CF6"
                  />
                  <NexusButton
                    label="Aplicar cor"
                    variant="secondary"
                    onPress={applyCustomAccent}
                    fullWidth
                  />
                </Card>
              ) : null}
            </Section>

            <Section
              title="Conforto"
              subtitle="Ajustes de movimento, vibração e som."
            >
              <SwitchRow
                label="Movimento reduzido"
                description="Remove animações que possam incomodar."
                value={data.preferences.reducedMotion}
                onChange={(value) =>
                  updatePreferences({ reducedMotion: value })
                }
              />
              <SwitchRow
                label="Vibração sutil"
                description="Feedback ao concluir tarefas."
                value={data.preferences.haptics}
                onChange={(value) => updatePreferences({ haptics: value })}
              />
              <SwitchRow
                label="Sons"
                description="Ativa ambientes e efeitos opcionais do Focus OS."
                value={data.preferences.sound}
                onChange={(value) => updatePreferences({ sound: value })}
              />
              <NexusButton
                label="Abrir Command Center"
                variant="secondary"
                onPress={() => router.push("/customize")}
                fullWidth
              />
              <NexusButton
                label="Abrir Widget Studio"
                variant="ghost"
                onPress={() => router.push("/widget-studio")}
                fullWidth
              />
            </Section>
          </>
        ) : null}

        {area === "sistema" ? (
          <>
            <Section
              title="Inteligência"
              subtitle="A chave da OpenRouter continua exclusivamente no backend."
            >
              <Card style={styles.statusCard}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: intelligenceOnline
                        ? colors.success
                        : status
                          ? colors.warning
                          : colors.danger,
                    },
                  ]}
                />
                <View style={styles.flex}>
                  <NexusText variant="subtitle">
                    {intelligenceOnline
                      ? "IA remota online"
                      : status?.configured
                        ? "Backend online, provedor instável"
                        : status
                          ? "Fallback local ativo"
                          : "Backend indisponível"}
                  </NexusText>
                  <NexusText variant="caption" secondary>
                    {intelligenceOnline
                      ? `API ${status?.apiVersion ?? "sem versão"} • ${status?.probeModel ?? status?.primaryModel ?? "modelo não identificado"}`
                      : (status?.probeMessage ??
                        "Teste a conexão para separar problema de backend, chave e modelo.")}
                  </NexusText>
                </View>
              </Card>
              <NexusButton
                label="Testar conexão agora"
                variant="secondary"
                loading={statusLoading}
                onPress={() => refreshStatus(true)}
                fullWidth
              />
              {status ? (
                <Card style={styles.diagnosticCard}>
                  <DiagnosticRow
                    label="Backend"
                    value={status.endpoint ?? "não identificado"}
                  />
                  <DiagnosticRow
                    label="Ping do backend"
                    value={
                      status.latencyMs !== undefined
                        ? `${status.latencyMs} ms`
                        : "sem resposta"
                    }
                  />
                  <DiagnosticRow
                    label="Serviço"
                    value={status.service ?? "legado/indefinido"}
                  />
                  <DiagnosticRow
                    label="Modelo testado"
                    value={
                      status.probeModel ?? "teste rápido ainda não executado"
                    }
                  />
                  <DiagnosticRow
                    label="Resposta do modelo"
                    value={
                      status.probeLatencyMs !== undefined
                        ? `${status.probeLatencyMs} ms`
                        : (status.probeMessage ?? "toque em testar conexão")
                    }
                  />
                  <DiagnosticRow
                    label="Última checagem"
                    value={
                      status.checkedAt
                        ? new Date(status.checkedAt).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : "agora"
                    }
                  />
                </Card>
              ) : null}
              {lastAssistantMeta ? (
                <Card style={styles.diagnosticCard}>
                  <NexusText
                    variant="mono"
                    color={
                      lastAssistantMeta.source === "remote"
                        ? colors.success
                        : colors.warning
                    }
                  >
                    ÚLTIMA RESPOSTA
                  </NexusText>
                  <DiagnosticRow
                    label="Origem"
                    value={
                      lastAssistantMeta.source === "remote"
                        ? "OpenRouter"
                        : "Plano local"
                    }
                  />
                  <DiagnosticRow
                    label="Modelo"
                    value={lastAssistantMeta.model ?? "não usado"}
                  />
                  <DiagnosticRow
                    label="Tempo"
                    value={`${Math.max(1, Math.round(lastAssistantMeta.latencyMs / 1000))} s`}
                  />
                  <DiagnosticRow
                    label="Tentativas"
                    value={String(lastAssistantMeta.attempts)}
                  />
                </Card>
              ) : null}
              <Card
                style={[
                  styles.infoCard,
                  { backgroundColor: `${colors.primary}0C` },
                ]}
              >
                <NexusText variant="subtitle">
                  Quando a IA não responder
                </NexusText>
                <NexusText variant="caption" secondary>
                  O app mantém captura, revisão e planejamento local. Para
                  reativar Brain e Atlas online, publique esta versão do backend
                  e configure OPENROUTER_API_KEY no Render.
                </NexusText>
              </Card>
            </Section>

            <Section
              title="Atualizações"
              subtitle="Correções comuns chegam sem reinstalar o APK."
            >
              <Card
                style={[
                  styles.changelogCard,
                  { borderColor: `${colors.primary}55` },
                ]}
              >
                <NexusText variant="mono" color={colors.primarySoft}>
                  {OTA_RELEASE.title.toUpperCase()} • OTA {OTA_RELEASE.update}
                </NexusText>
                {OTA_RELEASE.notes.map((note) => (
                  <NexusText key={note} variant="caption" secondary>
                    • {note}
                  </NexusText>
                ))}
              </Card>
              <Card style={styles.updateCard}>
                <View style={styles.updateRow}>
                  <NexusText variant="caption" secondary>
                    Versão nativa
                  </NexusText>
                  <NexusText variant="mono">
                    {updateInfo.nativeVersion}
                  </NexusText>
                </View>
                <View style={styles.updateRow}>
                  <NexusText variant="caption" secondary>
                    Runtime OTA
                  </NexusText>
                  <NexusText variant="mono">
                    {updateInfo.runtimeVersion}
                  </NexusText>
                </View>
                <View style={styles.updateRow}>
                  <NexusText variant="caption" secondary>
                    Canal
                  </NexusText>
                  <NexusText variant="mono">{updateInfo.channel}</NexusText>
                </View>
                <View style={styles.updateRow}>
                  <NexusText variant="caption" secondary>
                    Atualização ativa
                  </NexusText>
                  <NexusText variant="mono">
                    {updateInfo.isEmbedded ? "embutida" : updateInfo.updateId}
                  </NexusText>
                </View>
                {updateInfo.emergencyLaunch ? (
                  <NexusText variant="caption" color={colors.warning}>
                    O Expo recuperou automaticamente a última versão estável.
                  </NexusText>
                ) : null}
              </Card>
              <NexusButton
                label={
                  updateAvailable
                    ? "Baixar e reiniciar"
                    : "Verificar atualização"
                }
                variant={updateAvailable ? "primary" : "secondary"}
                loading={updateBusy}
                onPress={() =>
                  void (updateAvailable ? installUpdate() : checkUpdates())
                }
                fullWidth
              />
              <NexusText variant="caption" secondary>
                Atualizações que alteram módulos nativos, permissões ou
                bibliotecas ainda exigem um novo APK.
              </NexusText>
            </Section>

            <Section
              title="Lembrete diário"
              subtitle="A permissão só é pedida quando você ativa."
            >
              <Field
                label="Horário"
                value={notificationTime}
                onChangeText={setNotificationTime}
                maxLength={5}
                placeholder="18:00"
                keyboardType="numbers-and-punctuation"
              />
              <SwitchRow
                label="Notificação diária"
                description="Nexus online: sua missão de hoje está pronta."
                value={data.preferences.notificationEnabled}
                onChange={(value) => void setReminder(value)}
              />
              {Platform.OS === "web" ? (
                <NexusText variant="caption" secondary>
                  Configure lembretes no APK Android. O preview web continua
                  funcionando sem notificações.
                </NexusText>
              ) : null}
            </Section>
          </>
        ) : null}

        {area === "dados" ? (
          <>
            <Section
              title="Backup e privacidade"
              subtitle="Seus dados ficam locais até você exportá-los."
            >
              <NexusButton
                label="Exportar dados em JSON"
                variant="secondary"
                onPress={() => void exportData()}
                fullWidth
              />
              <NexusButton
                label="Importar backup"
                variant="ghost"
                onPress={() => void importData()}
                fullWidth
              />
              <Card style={styles.privacyCard}>
                <NexusText variant="subtitle">Privacidade por padrão</NexusText>
                <NexusText variant="caption" secondary>
                  Perfil, tarefas, XP, chats e roadmaps ficam no armazenamento
                  privado do app. Somente contexto sanitizado e limitado é
                  enviado ao backend.
                </NexusText>
              </Card>
              <NexusButton
                label="Ler política completa"
                variant="ghost"
                onPress={() => router.push("/privacy" as never)}
                fullWidth
              />
            </Section>

            <Section
              title="Zona de controle"
              subtitle="Ações destrutivas sempre pedem confirmação."
            >
              <NexusButton
                label="Reiniciar somente o plano de hoje"
                variant="ghost"
                onPress={() => setResetTodayOpen(true)}
                fullWidth
              />
              <NexusButton
                label="Apagar todos os dados"
                variant="danger"
                onPress={() => setResetAllOpen(true)}
                fullWidth
              />
            </Section>
          </>
        ) : null}

        {message ? (
          <Card
            style={[styles.message, { borderColor: `${colors.primary}55` }]}
          >
            <NexusText variant="caption">{message}</NexusText>
          </Card>
        ) : null}
        <NexusText variant="caption" secondary style={styles.footer}>
          Nexus AI 2.3.0 • Widget Family • Personal Mission OS
        </NexusText>
      </Screen>

      <ConfirmDialog
        visible={resetTodayOpen}
        title="Reiniciar o plano de hoje?"
        message="O plano atual será substituído por uma versão local. Seu perfil e histórico não serão apagados."
        confirmLabel="Reiniciar plano"
        onCancel={() => setResetTodayOpen(false)}
        onConfirm={() => {
          resetToday();
          setResetTodayOpen(false);
        }}
      />
      <ConfirmDialog
        visible={resetAllOpen}
        title="Apagar tudo do Nexus?"
        message="Perfil, tarefas, XP, sessões e histórico serão removidos deste dispositivo. Exporte um backup antes se quiser recuperar depois."
        confirmLabel="Apagar tudo"
        destructive
        onCancel={() => setResetAllOpen(false)}
        onConfirm={() => {
          setResetAllOpen(false);
          void resetAll().then(() => router.replace("/onboarding"));
        }}
      />
    </>
  );
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
        {subtitle ? (
          <NexusText variant="caption" secondary>
            {subtitle}
          </NexusText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ControlCard({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors } = useNexus();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.controlCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.controlIcon, { backgroundColor: `${colors.primary}18` }]}
      >
        <NexusText variant="title" color={colors.primarySoft}>
          {icon}
        </NexusText>
      </View>
      <NexusText variant="subtitle">{title}</NexusText>
      <NexusText variant="caption" secondary>
        {description}
      </NexusText>
    </Pressable>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.updateRow}>
      <NexusText variant="caption" secondary>
        {label}
      </NexusText>
      <NexusText
        variant="caption"
        numberOfLines={1}
        style={styles.diagnosticValue}
      >
        {value}
      </NexusText>
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.summaryMetric}>
      <NexusText variant="title">{value}</NexusText>
      <NexusText variant="caption" secondary>
        {label}
      </NexusText>
    </Card>
  );
}

function ProfileChoice({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string | number;
  options: (readonly [string | number, string])[];
  onChange: (value: string | number) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <NexusText variant="caption" secondary>
        {title}
      </NexusText>
      <View style={styles.chips}>
        {options.map(([optionValue, label]) => (
          <ChoiceChip
            key={String(optionValue)}
            label={label}
            selected={value === optionValue}
            onPress={() => onChange(optionValue)}
          />
        ))}
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useNexus();
  return (
    <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
      <View style={styles.flex}>
        <NexusText variant="subtitle">{label}</NexusText>
        {description ? (
          <NexusText variant="caption" secondary>
            {description}
          </NexusText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  areaNav: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  section: { marginTop: 27, gap: 13 },
  sectionTitle: { gap: 4 },
  choiceGroup: { gap: 9 },
  controlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  controlCard: {
    width: "47%",
    flexGrow: 1,
    minHeight: 132,
    borderRadius: 19,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  controlIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryMetric: {
    width: "47%",
    flexGrow: 1,
    minHeight: 82,
    justifyContent: "center",
    gap: 4,
  },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  themeCard: {
    width: "47%",
    flexGrow: 1,
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  themeDot: { width: 22, height: 22, borderRadius: 8 },
  customColorCard: { gap: 12 },
  switchRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  diagnosticCard: { gap: 8 },
  changelogCard: { gap: 7 },
  diagnosticValue: { maxWidth: "64%", textAlign: "right" },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  infoCard: { gap: 7 },
  updateCard: { gap: 10 },
  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  privacyCard: { gap: 7 },
  message: { marginTop: 22 },
  footer: { textAlign: "center", marginTop: 28, marginBottom: 8 },
});
