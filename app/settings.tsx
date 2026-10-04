import { Children, useEffect, useState } from "react";
import { Alert, BackHandler, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PixelMascot } from "@/components/PixelMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { NexusIcon, type NexusIconName } from "@/components/ui/NexusIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge, IconButton, Stat } from "@/components/ui/Layout";
import { getTheme } from "@/theme/theme";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import { pickBackupJson, shareBackupJson } from "@/services/backup.service";
import type { BackupImportPreview } from "@/services/storage.service";
import { configureDailyReminder } from "@/services/notification.service";
import { getIntelligenceStatus, type IntelligenceStatus } from "@/services/status.service";
import {
  applyNexusUpdate,
  checkForNexusUpdate,
  getNexusUpdateInfo,
  type NexusUpdateInfo,
} from "@/services/update.service";
import { OTA_RELEASE } from "@/constants/release";
import type { Weekday } from "@/types";
import { calculateLevel } from "@/utils/levels";

export { RouteErrorBoundary as ErrorBoundary };

type Page = "index" | "perfil" | "ia" | "updates" | "dados";

const DAYS: readonly { value: Weekday; label: string }[] = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

export default function SettingsScreen() {
  const {
    data,
    colors,
    lastAssistantMeta,
    updateProfile,
    updatePreferences,
    exportBackup,
    inspectBackup,
    importBackup,
    restoreImportBackup,
    hasImportRollback,
    restoreMigrationBackup,
    hasMigrationBackup,
    resetToday,
    resetAll,
  } = useNexus();
  const profile = data.profile;
  const [page, setPage] = useState<Page>("index");
  const [name, setName] = useState(profile?.name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [goal, setGoal] = useState(profile?.mainGoal ?? "");
  const [minutes, setMinutes] = useState(String(profile?.availableMinutes ?? 120));
  const [schedule, setSchedule] = useState(profile?.schedule ?? "");
  const [notificationTime, setNotificationTime] = useState(data.preferences.notificationTime);
  const [status, setStatus] = useState<IntelligenceStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<NexusUpdateInfo>(getNexusUpdateInfo);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [resetTodayOpen, setResetTodayOpen] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    json: string;
    preview: BackupImportPreview;
  } | null>(null);
  const [restoreImportOpen, setRestoreImportOpen] = useState(false);
  const [restoreMigrationOpen, setRestoreMigrationOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshStatus = (deep = false) => {
    const controller = new AbortController();
    setStatusLoading(true);
    void getIntelligenceStatus(controller.signal, deep)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));
    return controller;
  };

  useEffect(() => {
    const controller = refreshStatus(false);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setName(profile?.name ?? "");
    setNickname(profile?.nickname ?? "");
    setGoal(profile?.mainGoal ?? "");
    setMinutes(String(profile?.availableMinutes ?? 120));
    setSchedule(profile?.schedule ?? "");
  }, [
    profile?.availableMinutes,
    profile?.mainGoal,
    profile?.name,
    profile?.nickname,
    profile?.schedule,
  ]);

  useEffect(() => {
    if (page === "index") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setPage("index"); return true; });
    return () => subscription.remove();
  }, [page]);

  if (!profile) return null;
  const level = calculateLevel(data.progress.totalXp);
  const intelligenceConfigured = status?.configured === true && status.assistantAvailable === true;
  const intelligenceProbed = intelligenceConfigured && status?.probeOk === true;

  const saveProfile = async () => {
    const availableMinutes = Number(minutes);
    if (!Number.isFinite(availableMinutes)) {
      setMessage("Revise nome, missão e minutos disponíveis.");
      return;
    }
    setProfileSaving(true);
    try {
      const ok = await updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        mainGoal: goal.trim(),
        availableMinutes,
        schedule: schedule.trim(),
      });
      setMessage(ok ? "Perfil salvo." : "Revise nome, missão e minutos disponíveis.");
    } finally {
      setProfileSaving(false);
    }
  };

  const setReminder = async (enabled: boolean) => {
    if (reminderBusy) return;
    if (enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) {
      setMessage("Use um horário válido no formato HH:MM.");
      return;
    }
    const previousEnabled = data.preferences.notificationEnabled;
    const previousTime = data.preferences.notificationTime;
    setReminderBusy(true);
    try {
      const result = await configureDailyReminder(enabled, notificationTime);
      const persisted = await updatePreferences({ notificationEnabled: result.enabled, notificationTime });
      if (!persisted) {
        await configureDailyReminder(previousEnabled, previousTime).catch(() => undefined);
        setMessage("A preferência não pôde ser salva; o lembrete anterior foi restaurado.");
        return;
      }
      setMessage(result.enabled ? "Lembrete salvo." : "Lembrete desativado.");
      if (result.reason) Alert.alert("Lembrete do Nexus", result.reason);
    } catch {
      setMessage("Não foi possível atualizar o lembrete. A configuração anterior foi mantida.");
    } finally {
      setReminderBusy(false);
    }
  };

  const checkUpdates = async () => {
    setUpdateBusy(true);
    try {
      const result = await checkForNexusUpdate();
      setUpdateInfo(result.info);
      setUpdateAvailable(result.available || result.rollbackAvailable);
      setMessage(
        !result.info.enabled
          ? "Atualizações remotas só funcionam em uma instalação de release."
          : result.available || result.rollbackAvailable
            ? "Há uma atualização pronta para baixar."
            : "Esta instalação já está atualizada.",
      );
    } catch {
      setMessage("Não foi possível verificar atualizações agora.");
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
        setUpdateBusy(false);
      }
    } catch {
      setMessage("A atualização não pôde ser aplicada; a versão atual continua intacta.");
      setUpdateBusy(false);
    }
  };

  const exportData = async () => {
    if (dataBusy) return;
    setDataBusy(true);
    try {
      await shareBackupJson(exportBackup());
      setMessage("Backup preparado com sucesso.");
    } catch {
      setMessage("Não foi possível exportar o backup neste dispositivo.");
    } finally {
      setDataBusy(false);
    }
  };

  const importData = async () => {
    if (dataBusy) return;
    setDataBusy(true);
    try {
      const json = await pickBackupJson();
      if (!json) return;
      const preview = inspectBackup(json);
      setPendingImport({ json, preview });
      setMessage("Backup validado. Confira o resumo antes de substituir os dados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "O arquivo não é um backup válido.");
    } finally {
      setDataBusy(false);
    }
  };

  const primaryGoal = data.lockIn.goals.some((g) => g.state === "primary");
  const statusTone = statusLoading ? colors.warning : intelligenceProbed ? colors.success : intelligenceConfigured ? colors.warning : colors.danger;
  const statusLabel = statusLoading ? "Verificando" : intelligenceProbed ? "Respondendo" : intelligenceConfigured ? "Configurado" : "Indisponível";
  const mascotName = { nexus: "Nexus", atlas: "Atlas", byte: "Byte", nova: "Nova", pulse: "Pulse", orbit: "Orbit", ember: "Ember" }[data.preferences.mascot.companion] ?? "Nexus";
  const open = (next: Page) => { setMessage(""); setPage(next); };
  const pageTitle = { index: "Configurações", perfil: "Perfil e meta", ia: "Inteligência remota", updates: "Atualizações", dados: "Backup e dados" }[page];

  return (
    <>
      <Screen maxWidth={640}>
        <View style={styles.page}>
          <View style={styles.nav}>
            <IconButton icon="back" label={page === "index" ? "Voltar" : "Voltar para Configurações"} onPress={() => page === "index" ? router.back() : open("index")} />
            <NexusText variant="subtitle" accessibilityRole="header" style={styles.flex}>{pageTitle}</NexusText>
          </View>

          {page === "index" ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => open("perfil")}>
                {({ pressed }) => (
                  <Card elevated style={[styles.profileCard, pressed && styles.pressed]}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}><PixelMascot state="idle" size={40} /></View>
                    <View style={styles.profileText}>
                      <NexusText variant="title">{profile.nickname}</NexusText>
                      <View style={styles.rowBetween}>
                        <NexusText variant="caption" secondary>Nível {level.level} · {level.title}</NexusText>
                        <NexusText variant="caption" secondary>{data.progress.totalXp} XP</NexusText>
                      </View>
                      <ProgressBar progress={level.progress} />
                    </View>
                    <NexusIcon name="chevron" color={colors.textSecondary} size={16} />
                  </Card>
                )}
              </Pressable>

              <Group label="Personalizar">
                <Row icon="palette" tone={colors.primary} title="Aparência" value={getTheme(data.preferences).label} onPress={() => router.push("/customize")} />
                <Row icon="widget" tone={colors.success} title="Widget Studio" value="Tela inicial" onPress={() => router.push("/widget-studio")} />
                <Row icon="smile" tone={colors.warning} title="Companion" value={data.preferences.mascot.showCompanion ? mascotName : "Oculto"} onPress={() => router.push("/customize")} />
              </Group>

              <Group label="Rotina">
                <View style={styles.reminderRow}>
                  <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}1F` }]}><NexusIcon name="bell" color={colors.primary} size={18} /></View>
                  <View style={styles.flex}>
                    <NexusText variant="subtitle">Lembrete diário</NexusText>
                    <NexusText variant="caption" secondary>{Platform.OS === "web" ? "Configurado no aplicativo Android." : `Todos os dias às ${notificationTime}`}</NexusText>
                  </View>
                  <Switch accessibilityLabel="Notificação diária" disabled={reminderBusy} value={data.preferences.notificationEnabled} onValueChange={(value) => void setReminder(value)} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor={colors.text} />
                </View>
                <View style={[styles.inlineField, { borderTopColor: colors.border }]}>
                  <Field label="Horário do lembrete" value={notificationTime} onChangeText={setNotificationTime} maxLength={5} placeholder="18:00" keyboardType="numbers-and-punctuation" hint="Ative o lembrete de novo para aplicar um novo horário. A permissão só é pedida quando você ativa." />
                </View>
                <Row icon="user" tone={colors.textSecondary} title="Perfil e meta" caption="Nome, rotina, dias e tom" onPress={() => open("perfil")} />
              </Group>

              <Group label="Sistema">
                <Row icon="spark" tone={statusTone} title="Inteligência remota" value={statusLabel} dot={statusTone} onPress={() => open("ia")} />
                <Row icon="refresh" tone={colors.textSecondary} title="Atualizações" value={updateInfo.nativeVersion} onPress={() => open("updates")} />
              </Group>

              <Group label="Dados e privacidade">
                <Row icon="download" tone={colors.textSecondary} title="Backup e dados" caption="Local, sem conta" onPress={() => open("dados")} />
                <Row icon="shield" tone={colors.textSecondary} title="Privacidade" onPress={() => router.push("/privacy" as never)} />
              </Group>
            </>
          ) : null}

          {page === "perfil" ? (
            <>
              <Card style={styles.formCard}>
                <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
                <Field label="Como o Nexus chama você" value={nickname} onChangeText={setNickname} maxLength={40} />
                <Field label="Rotina relevante" value={schedule} onChangeText={setSchedule} multiline maxLength={600} />
              </Card>
              <Card style={styles.formCard}>
                {primaryGoal ? (
                  <View style={styles.formCard}>
                    <NexusText variant="eyebrow" secondary>Meta e horários</NexusText>
                    <NexusText secondary>Sua meta principal e suas janelas vivem no Plano, para manter capacidade e missão coerentes.</NexusText>
                    <NexusButton label="Revisar meta e horários no Plano" variant="secondary" onPress={() => router.push("/(tabs)/plan")} />
                  </View>
                ) : null}
                <Field editable={!primaryGoal} label="Missão de longo prazo" value={goal} onChangeText={setGoal} multiline maxLength={600} />
                <Field editable={!primaryGoal} label="Minutos disponíveis por dia" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
              </Card>
              <Card style={styles.formCard}>
                <Choice title="Dias ativos">
                  {DAYS.map((day) => {
                    const selected = profile.activeDays.includes(day.value);
                    return (
                      <ChoiceChip
                        key={day.value}
                        label={day.label}
                        selected={selected}
                        onPress={() => {
                          const next = selected
                            ? profile.activeDays.filter((item) => item !== day.value)
                            : [...profile.activeDays, day.value].sort() as Weekday[];
                          if (next.length) void updateProfile({ activeDays: next });
                        }}
                      />
                    );
                  })}
                </Choice>
                <Choice title="Máximo diário">
                  {([2, 3, 4, 5] as const).map((value) => (
                    <ChoiceChip key={value} label={`${value} tarefas`} selected={profile.maxDailyTasks === value} onPress={() => void updateProfile({ maxDailyTasks: value })} />
                  ))}
                </Choice>
                <Choice title="Intensidade">
                  {(["leve", "equilibrado", "intenso"] as const).map((value) => (
                    <ChoiceChip key={value} label={{ leve: "Leve", equilibrado: "Equilibrada", intenso: "Intensa" }[value]} selected={profile.intensity === value} onPress={() => void updateProfile({ intensity: value })} />
                  ))}
                </Choice>
                <Choice title="Tom do Brain">
                  {(["direto", "parceiro", "treinador"] as const).map((value) => (
                    <ChoiceChip key={value} label={{ direto: "Direto", parceiro: "Parceiro", treinador: "Treinador" }[value]} selected={profile.assistantTone === value} onPress={() => void updateProfile({ assistantTone: value })} />
                  ))}
                </Choice>
              </Card>
              <NexusButton label="Salvar perfil" loading={profileSaving} onPress={() => void saveProfile()} fullWidth />
            </>
          ) : null}

          {page === "ia" ? (
            <>
              <Card elevated style={styles.formCard}>
                <Badge label={statusLoading ? "Verificando" : intelligenceProbed ? "Respondendo agora" : intelligenceConfigured ? "Configurado" : "Indisponível agora"} color={statusTone} />
                <NexusText variant="title">{statusLoading ? "Verificando o backend…" : intelligenceProbed ? "Brain e Atlas responderam ao teste" : intelligenceConfigured ? "Backend configurado; teste a conexão" : "IA temporariamente indisponível"}</NexusText>
                <NexusText secondary>
                  {intelligenceProbed
                    ? `API ${status?.apiVersion ?? "compatível"}${status?.probeLatencyMs !== undefined ? ` • ${status.probeLatencyMs} ms` : ""}`
                    : intelligenceConfigured
                      ? `API ${status?.apiVersion ?? "compatível"} registrada. O teste abaixo confirma cota e resposta do provedor.`
                      : status?.probeMessage ?? "Tente novamente; seus dados e seu texto permanecem no aparelho."}
                </NexusText>
                <NexusButton label="Testar conexão" loading={statusLoading} onPress={() => refreshStatus(true)} fullWidth />
              </Card>
              {lastAssistantMeta ? (
                <Group label="Última tentativa">
                  <InfoRow label="Modelo" value={lastAssistantMeta.model ?? "não selecionado"} />
                  <InfoRow label="Latência" value={`${lastAssistantMeta.latencyMs} ms`} />
                  <InfoRow label="Tentativas" value={String(lastAssistantMeta.attempts)} />
                  {lastAssistantMeta.errorCode ? <InfoRow label="Status" value={lastAssistantMeta.errorCode} tone={colors.warning} /> : null}
                </Group>
              ) : null}
              <Group label="Privacidade da IA">
                <Check text="Somente provedores com retenção zero (ZDR)" />
                <Check text="A chave fica no servidor, nunca no app" />
                <Check text="Falha remota nunca vira resposta local fingida" />
              </Group>
            </>
          ) : null}

          {page === "updates" ? (
            <>
              <Group label={OTA_RELEASE.title}>
                <InfoRow label="Versão" value={updateInfo.nativeVersion} />
                <InfoRow label="Runtime" value={updateInfo.runtimeVersion} />
                <InfoRow label="Canal" value={updateInfo.channel} />
              </Group>
              <NexusText variant="caption" secondary>Mudança nativa exige nova instalação; correções compatíveis podem usar OTA.</NexusText>
              <NexusButton
                label={updateAvailable ? "Baixar e reiniciar" : "Verificar atualização"}
                variant={updateAvailable ? "primary" : "secondary"}
                loading={updateBusy}
                onPress={() => void (updateAvailable ? installUpdate() : checkUpdates())}
                fullWidth
              />
            </>
          ) : null}

          {page === "dados" ? (
            <>
              <Card elevated style={styles.formCard}>
                <NexusText variant="eyebrow" secondary>Neste aparelho</NexusText>
                <View style={styles.statsRow}>
                  <Stat label="dias" value={String(data.history.length)} />
                  <Stat label="sessões" value={String(data.progress.focusSessions.length)} />
                  <Stat label="conversas" value={String(data.brain.threads.length)} />
                  <Stat label="trilhas" value={String(data.learning.roadmaps.length)} />
                </View>
                <NexusText variant="caption" secondary>O conteúdo permanece local até você decidir exportar.</NexusText>
              </Card>
              <Group>
                <Row icon="download" tone={colors.success} title="Exportar backup JSON" caption="Arquivo para guardar ou mover" disabled={dataBusy} onPress={() => void exportData()} />
                <Row icon="upload" tone={colors.primary} title="Importar backup" caption="Mostra um resumo antes de substituir" disabled={dataBusy} onPress={() => void importData()} />
                {hasImportRollback ? <Row icon="undo" tone={colors.textSecondary} title="Desfazer última importação" caption="Volta ao snapshot anterior" disabled={dataBusy} onPress={() => setRestoreImportOpen(true)} /> : null}
                {hasMigrationBackup ? <Row icon="clock" tone={colors.textSecondary} title="Restaurar cópia pré-migração" caption="Versão anterior ao formato atual" disabled={dataBusy} onPress={() => setRestoreMigrationOpen(true)} /> : null}
              </Group>
              <Group label="Zona de risco" danger>
                {primaryGoal
                  ? <Row icon="refresh" tone={colors.warning} title="Revisar plano de hoje" caption="Abre o Plano; nada é apagado" onPress={() => router.push("/(tabs)/plan")} />
                  : <Row icon="refresh" tone={colors.warning} title="Recriar plano de hoje" caption="Preserva concluídas, XP e histórico" onPress={() => setResetTodayOpen(true)} />}
                <Row icon="trash" tone={colors.danger} title="Apagar todos os dados" caption="Pede confirmação. Não tem volta." danger onPress={() => setResetAllOpen(true)} />
              </Group>
            </>
          ) : null}

          {message ? <Card tone="accent"><NexusText variant="caption">{message}</NexusText></Card> : null}
          {page === "index" ? <NexusText variant="caption" secondary style={styles.footer}>Nexus AI {OTA_RELEASE.label} · runtime {updateInfo.runtimeVersion}</NexusText> : null}
        </View>
      </Screen>

      <ConfirmDialog
        visible={Boolean(pendingImport)}
        title="Substituir pelos dados deste backup?"
        message="Perfil, plano, progresso, conversas e preferências atuais serão substituídos. Um snapshot local será criado para permitir desfazer."
        confirmLabel="Importar e substituir"
        destructive
        loading={dataBusy}
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          const selected = pendingImport;
          if (!selected) return;
          setDataBusy(true);
          void importBackup(selected.json)
            .then(() => {
              setPendingImport(null);
              setMessage("Backup importado com sucesso. A versão anterior pode ser restaurada.");
            })
            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "A importação falhou e os dados anteriores foram restaurados."))
            .finally(() => setDataBusy(false));
        }}
      >
        {pendingImport ? (
          <Card style={styles.infoCard}>
            <InfoRow label="Perfil" value={pendingImport.preview.nickname} />
            <InfoRow label="Tarefas ativas" value={String(pendingImport.preview.activeTasks)} />
            <InfoRow label="Roadmaps" value={String(pendingImport.preview.roadmaps)} />
            <InfoRow label="Conversas" value={String(pendingImport.preview.conversations)} />
            <InfoRow label="Sessões de foco" value={String(pendingImport.preview.focusSessions)} />
          </Card>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        visible={restoreImportOpen}
        title="Desfazer a última importação?"
        message="O snapshot criado antes da importação voltará a ser o estado atual."
        confirmLabel="Restaurar estado anterior"
        loading={dataBusy}
        onCancel={() => setRestoreImportOpen(false)}
        onConfirm={() => {
          setDataBusy(true);
          void restoreImportBackup()
            .then((restored) => {
              if (restored) setRestoreImportOpen(false);
              setMessage(restored ? "Estado anterior restaurado." : "O snapshot anterior não está mais disponível.");
            })
            .catch(() => setMessage("Não foi possível restaurar o snapshot anterior."))
            .finally(() => setDataBusy(false));
        }}
      />
      <ConfirmDialog
        visible={restoreMigrationOpen}
        title="Restaurar a cópia anterior à migração?"
        message="Esta restauração substitui os dados atuais pela cópia anterior à migração, inclusive metas e registros mais recentes. Exporte o estado atual antes de continuar. Ele também será salvo para permitir desfazer; a cópia antiga será convertida ao formato atual. Voltar a uma versão antiga do aplicativo não é um rollback transparente."
        confirmLabel="Restaurar cópia anterior"
        loading={dataBusy}
        onCancel={() => setRestoreMigrationOpen(false)}
        onConfirm={() => {
          setDataBusy(true);
          void restoreMigrationBackup()
            .then((restored) => {
              if (restored) setRestoreMigrationOpen(false);
              setMessage(restored ? "Cópia anterior à migração restaurada." : "Nenhuma cópia recuperável foi encontrada.");
            })
            .catch(() => setMessage("Não foi possível restaurar a cópia anterior; o estado atual foi mantido."))
            .finally(() => setDataBusy(false));
        }}
      />
      <ConfirmDialog
        visible={resetTodayOpen}
        title="Recriar o plano de hoje?"
        message="O planejamento pendente será recriado offline. Tarefas e missão já concluídas, XP, foco, perfil e histórico serão preservados."
        confirmLabel="Recriar"
        loading={dataBusy}
        onCancel={() => setResetTodayOpen(false)}
        onConfirm={() => {
          setDataBusy(true);
          void resetToday()
            .then((saved) => {
              if (saved) setResetTodayOpen(false);
              else setMessage("Não foi possível confirmar a recriação do plano. O estado anterior foi mantido.");
            })
            .finally(() => setDataBusy(false));
        }}
      />
      <ConfirmDialog
        visible={resetAllOpen}
        title="Apagar todos os dados?"
        message="Perfil, tarefas, XP, chats e histórico serão removidos deste dispositivo. Exporte um backup antes se quiser recuperá-los."
        confirmLabel="Apagar tudo"
        destructive
        loading={dataBusy}
        onCancel={() => setResetAllOpen(false)}
        onConfirm={() => {
          setDataBusy(true);
          void resetAll()
            .then(() => {
              setResetAllOpen(false);
              router.replace("/onboarding");
            })
            .catch(() => setMessage("Não foi possível apagar todos os dados; o estado atual foi mantido."))
            .finally(() => setDataBusy(false));
        }}
      />
    </>
  );
}

function Group({ label, danger = false, children }: { label?: string; danger?: boolean; children: React.ReactNode }) {
  const { colors, visuals } = useNexus();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {label ? <NexusText variant="eyebrow" color={danger ? colors.danger : colors.textSecondary} style={styles.groupLabel}>{label}</NexusText> : null}
      <View style={[styles.groupBox, { backgroundColor: colors.surface, borderColor: danger ? `${colors.danger}40` : colors.border, borderRadius: visuals.cardRadius }]}>
        {items.map((child, index) => <View key={index} style={index > 0 ? [styles.groupItem, { borderTopColor: colors.border }] : undefined}>{child}</View>)}
      </View>
    </View>
  );
}

function Row({ icon, tone, title, caption, value, dot, danger = false, disabled = false, onPress }: { icon: NexusIconName; tone: string; title: string; caption?: string; value?: string; dot?: string; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  const { colors } = useNexus();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: `${tone}1F` }]}><NexusIcon name={icon} color={tone} size={18} /></View>
      <View style={styles.flex}>
        <NexusText variant="subtitle" color={danger ? colors.danger : undefined}>{title}</NexusText>
        {caption ? <NexusText variant="caption" secondary>{caption}</NexusText> : null}
      </View>
      {value ? <View style={styles.rowValue}>{dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}<NexusText variant="caption" secondary numberOfLines={1}>{value}</NexusText></View> : null}
      <NexusIcon name="chevron" color={colors.textSecondary} size={16} />
    </Pressable>
  );
}

function Choice({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.choice}><NexusText variant="eyebrow" secondary>{title}</NexusText><View style={styles.chips}>{children}</View></View>;
}

function Check({ text }: { text: string }) {
  const { colors } = useNexus();
  return <View style={styles.check}><NexusIcon name="check" color={colors.success} size={16} /><NexusText variant="caption" style={styles.flex}>{text}</NexusText></View>;
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <View style={styles.infoRow}><NexusText variant="caption" secondary>{label}</NexusText><NexusText variant="caption" color={tone} numberOfLines={1} style={styles.infoValue}>{value}</NexusText></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 18, paddingBottom: 24 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.8 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  profileText: { flex: 1, gap: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  group: { gap: 8 },
  groupLabel: { paddingHorizontal: 4 },
  groupBox: { borderWidth: 1, overflow: "hidden" },
  groupItem: { borderTopWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowValue: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "42%" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  inlineField: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, borderTopWidth: 1 },
  formCard: { gap: 14 },
  infoCard: { paddingHorizontal: 0, paddingVertical: 4 },
  statsRow: { flexDirection: "row", gap: 8 },
  choice: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  check: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  infoValue: { maxWidth: "65%", textAlign: "right" },
  footer: { textAlign: "center", marginTop: 8 },
});
