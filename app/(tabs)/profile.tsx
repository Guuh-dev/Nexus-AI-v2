import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PixelMascot } from "@/components/PixelMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
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

type Area = "perfil" | "sistema" | "dados";

const DAYS: readonly { value: Weekday; label: string }[] = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

export default function ProfileScreen() {
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
  const [area, setArea] = useState<Area>("perfil");
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

  return (
    <>
      <Screen maxWidth={760}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}16`, borderColor: colors.borderStrong }]}>
            <PixelMascot state="idle" size={58} />
          </View>
          <View style={styles.flex}>
            <NexusText variant="display">{profile.nickname}</NexusText>
            <NexusText variant="mono" color={colors.primarySoft}>NÍVEL {level.level} • {level.title.toUpperCase()}</NexusText>
            <NexusText variant="caption" secondary>{data.progress.totalXp} XP • {data.progress.currentStreak} dias de sequência</NexusText>
          </View>
        </View>

        <View style={styles.primaryActions}>
          <NexusButton label="Aparência" variant="secondary" onPress={() => router.push("/customize")} style={styles.flex} />
          <NexusButton label="Widget Studio" variant="secondary" onPress={() => router.push("/widget-studio")} style={styles.flex} />
        </View>

        <View style={[styles.areaTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChoiceChip label="Perfil" selected={area === "perfil"} onPress={() => setArea("perfil")} />
          <ChoiceChip label="Sistema" selected={area === "sistema"} onPress={() => setArea("sistema")} />
          <ChoiceChip label="Dados" selected={area === "dados"} onPress={() => setArea("dados")} />
        </View>

        {area === "perfil" ? (
          <Section title="Seu contexto" subtitle="Somente informações que melhoram missão, tarefas e orientação.">
            <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
            <Field label="Como o Nexus chama você" value={nickname} onChangeText={setNickname} maxLength={40} />
            <Field label="Missão de longo prazo" value={goal} onChangeText={setGoal} multiline maxLength={600} />
            <Field label="Minutos disponíveis por dia" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
            <Field label="Rotina relevante" value={schedule} onChangeText={setSchedule} multiline maxLength={600} />
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
            <NexusButton label="Salvar perfil" loading={profileSaving} onPress={() => void saveProfile()} fullWidth />
          </Section>
        ) : null}

        {area === "sistema" ? (
          <>
            <Section title="Inteligência remota" subtitle="Configuração do backend e teste real sob demanda, sem resposta local fingindo ser IA.">
              <Card style={styles.statusCard}>
                <View style={[styles.statusDot, { backgroundColor: statusLoading ? colors.warning : intelligenceProbed ? colors.success : intelligenceConfigured ? colors.warning : colors.danger }]} />
                <View style={styles.flex}>
                  <NexusText variant="subtitle">{statusLoading ? "Verificando…" : intelligenceProbed ? "Brain e Atlas responderam ao teste" : intelligenceConfigured ? "Backend configurado; teste a conexão" : "IA temporariamente indisponível"}</NexusText>
                  <NexusText variant="caption" secondary>
                    {intelligenceProbed
                      ? `API ${status?.apiVersion ?? "compatível"}${status?.probeLatencyMs !== undefined ? ` • ${status.probeLatencyMs} ms` : ""}`
                      : intelligenceConfigured
                        ? `API ${status?.apiVersion ?? "compatível"} registrada. O teste abaixo confirma cota e resposta do provedor.`
                      : status?.probeMessage ?? "Tente novamente; seus dados e seu texto permanecem no aparelho."}
                  </NexusText>
                </View>
              </Card>
              <NexusButton label="Testar conexão" variant="secondary" loading={statusLoading} onPress={() => refreshStatus(true)} fullWidth />
              {lastAssistantMeta ? (
                <Card style={styles.infoCard}>
                  <NexusText variant="mono" color={lastAssistantMeta.source === "remote" ? colors.success : colors.warning}>ÚLTIMA TENTATIVA</NexusText>
                  <InfoRow label="Modelo" value={lastAssistantMeta.model ?? "não selecionado"} />
                  <InfoRow label="Latência" value={`${lastAssistantMeta.latencyMs} ms`} />
                  <InfoRow label="Tentativas" value={String(lastAssistantMeta.attempts)} />
                  {lastAssistantMeta.errorCode ? <InfoRow label="Status" value={lastAssistantMeta.errorCode} /> : null}
                </Card>
              ) : null}
            </Section>

            <Section title="Atualizações" subtitle="Mudança nativa exige nova instalação; correções compatíveis podem usar OTA.">
              <Card style={styles.infoCard}>
                <NexusText variant="mono" color={colors.primarySoft}>{OTA_RELEASE.title.toUpperCase()}</NexusText>
                <InfoRow label="Versão" value={updateInfo.nativeVersion} />
                <InfoRow label="Runtime" value={updateInfo.runtimeVersion} />
                <InfoRow label="Canal" value={updateInfo.channel} />
              </Card>
              <NexusButton
                label={updateAvailable ? "Baixar e reiniciar" : "Verificar atualização"}
                variant={updateAvailable ? "primary" : "secondary"}
                loading={updateBusy}
                onPress={() => void (updateAvailable ? installUpdate() : checkUpdates())}
                fullWidth
              />
            </Section>

            <Section title="Lembrete" subtitle="A permissão só é solicitada quando você ativa.">
              <Field label="Horário" value={notificationTime} onChangeText={setNotificationTime} maxLength={5} placeholder="18:00" keyboardType="numbers-and-punctuation" />
              <Toggle label="Notificação diária" description="Lembra você de abrir a missão do dia." value={data.preferences.notificationEnabled} disabled={reminderBusy} onChange={(value) => void setReminder(value)} />
              {Platform.OS === "web" ? <NexusText variant="caption" secondary>Notificações são configuradas no aplicativo Android.</NexusText> : null}
            </Section>
          </>
        ) : null}

        {area === "dados" ? (
          <>
            <Section title="Backup e privacidade" subtitle="O conteúdo permanece local até você decidir exportar.">
              <NexusButton label="Exportar backup JSON" variant="secondary" loading={dataBusy} onPress={() => void exportData()} fullWidth />
              <NexusButton label="Importar backup" variant="ghost" disabled={dataBusy} onPress={() => void importData()} fullWidth />
              {hasImportRollback ? (
                <NexusButton label="Desfazer última importação" variant="ghost" disabled={dataBusy} onPress={() => setRestoreImportOpen(true)} fullWidth />
              ) : null}
              {hasMigrationBackup ? (
                <NexusButton label="Restaurar cópia anterior à v3" variant="ghost" disabled={dataBusy} onPress={() => setRestoreMigrationOpen(true)} fullWidth />
              ) : null}
              <NexusButton label="Política de privacidade" variant="ghost" onPress={() => router.push("/privacy" as never)} fullWidth />
            </Section>
            <Section title="Controle" subtitle="Ações destrutivas sempre exigem confirmação.">
              <NexusButton label="Recriar plano de hoje" variant="ghost" onPress={() => setResetTodayOpen(true)} fullWidth />
              <NexusButton label="Apagar todos os dados" variant="danger" onPress={() => setResetAllOpen(true)} fullWidth />
            </Section>
          </>
        ) : null}

        {message ? <Card style={[styles.message, { borderColor: colors.borderStrong }]}><NexusText variant="caption">{message}</NexusText></Card> : null}
        <NexusText variant="caption" secondary style={styles.footer}>Nexus AI {OTA_RELEASE.label} • Core Reborn</NexusText>
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
        message="Os dados preservados antes da conversão para a v3 voltarão ao estado atual. O estado de agora será salvo para permitir desfazer."
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

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionTitle}><NexusText variant="title">{title}</NexusText><NexusText variant="caption" secondary>{subtitle}</NexusText></View>{children}</View>;
}

function Choice({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.choice}><NexusText variant="caption" secondary>{title}</NexusText><View style={styles.chips}>{children}</View></View>;
}

function Toggle({ label, description, value, disabled = false, onChange }: { label: string; description: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useNexus();
  return (
    <Card style={styles.toggle}>
      <View style={styles.flex}><NexusText variant="subtitle">{label}</NexusText><NexusText variant="caption" secondary>{description}</NexusText></View>
      <Switch accessibilityLabel={label} disabled={disabled} value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor={colors.text} />
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><NexusText variant="caption" secondary>{label}</NexusText><NexusText variant="caption" numberOfLines={1} style={styles.infoValue}>{value}</NexusText></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 82, height: 82, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  areaTabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, borderWidth: 1, borderRadius: 16, padding: 7, marginTop: 16 },
  section: { marginTop: 26, gap: 11 },
  sectionTitle: { gap: 4, marginBottom: 2 },
  choice: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  infoCard: { gap: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  infoValue: { maxWidth: "65%", textAlign: "right" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  message: { marginTop: 22 },
  footer: { textAlign: "center", marginTop: 28, marginBottom: 8 },
});
