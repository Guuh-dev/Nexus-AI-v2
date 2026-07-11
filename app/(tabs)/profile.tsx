import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PixelMascot } from "@/components/PixelMascot";
import { WidgetPreview } from "@/components/WidgetPreview";
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
import { getIntelligenceStatus, type IntelligenceStatus } from "@/services/status.service";
import type { Profile, ThemeId, Weekday } from "@/types";
import { calculateLevel } from "@/utils/levels";

export { RouteErrorBoundary as ErrorBoundary };

const themes: { id: ThemeId; label: string; description: string; color: string }[] = [
  { id: "nexus", label: "Nexus Purple", description: "Comando premium roxo e preto", color: "#8B5CF6" },
  { id: "amoled", label: "AMOLED", description: "Preto puro e contraste máximo", color: "#9B7BFF" },
  { id: "oneui", label: "One UI Future", description: "Limpo, azul e arredondado", color: "#7C9CFF" },
  { id: "hud", label: "Mission HUD", description: "Terminal verde de execução", color: "#2DD4A8" },
  { id: "custom", label: "Personalizado", description: "Sua própria cor de destaque", color: "#F472B6" },
];

const profileDays: { value: Weekday; label: string }[] = [
  { value: 0, label: "D" }, { value: 1, label: "S" }, { value: 2, label: "T" }, { value: 3, label: "Q" },
  { value: 4, label: "Q" }, { value: 5, label: "S" }, { value: 6, label: "S" },
];

export default function ProfileScreen() {
  const { data, colors, updateProfile, updatePreferences, exportBackup, importBackup, resetToday, resetAll } = useNexus();
  const profile = data.profile;
  const [name, setName] = useState(profile?.name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [goal, setGoal] = useState(profile?.mainGoal ?? "");
  const [minutes, setMinutes] = useState(String(profile?.availableMinutes ?? 120));
  const [schedule, setSchedule] = useState(profile?.schedule ?? "");
  const [notificationTime, setNotificationTime] = useState(data.preferences.notificationTime);
  const [customAccent, setCustomAccent] = useState(data.preferences.customAccent);
  const [status, setStatus] = useState<IntelligenceStatus | null>(null);
  const [resetTodayOpen, setResetTodayOpen] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [message, setMessage] = useState("");
  const level = calculateLevel(data.progress.totalXp);

  useEffect(() => {
    const controller = new AbortController();
    void getIntelligenceStatus(controller.signal).then(setStatus);
    return () => controller.abort();
  }, []);

  if (!profile) return null;

  const saveProfile = () => {
    const ok = updateProfile({ name: name.trim(), nickname: nickname.trim(), mainGoal: goal.trim(), availableMinutes: Number(minutes), schedule: schedule.trim() });
    setMessage(ok ? "Perfil salvo." : "Revise os campos. A meta precisa ter pelo menos 10 caracteres.");
  };

  const setReminder = async (enabled: boolean) => {
    if (enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) {
      setMessage("Use um horário válido no formato HH:MM.");
      return;
    }
    const result = await configureDailyReminder(enabled, notificationTime);
    updatePreferences({ notificationEnabled: result.enabled, notificationTime });
    if (result.reason) Alert.alert("Lembrete do Nexus", result.reason);
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
      setMessage(error instanceof Error ? error.message : "O arquivo não é um backup válido.");
    }
  };

  return (
    <>
      <Screen>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}55` }]}><PixelMascot state="idle" size={62} /></View>
          <View style={styles.flex}>
            <NexusText variant="display">{profile.nickname}</NexusText>
            <NexusText variant="mono" color={colors.primarySoft}>NÍVEL {level.level} • {level.title.toUpperCase()}</NexusText>
            <NexusText variant="caption" secondary>{data.progress.totalXp} XP acumulado</NexusText>
          </View>
        </View>

        <Section title="Centrais do Nexus" subtitle="Personalização e sistemas avançados em áreas separadas.">
          <View style={styles.controlGrid}>
            <NexusButton label="Command Center" variant="secondary" onPress={() => router.push("/customize")} style={styles.controlButton} />
            <NexusButton label="Widget Studio" variant="secondary" onPress={() => router.push("/widget-studio")} style={styles.controlButton} />
            <NexusButton label="Operações" variant="ghost" onPress={() => router.push("/operations")} style={styles.controlButton} />
            <NexusButton label="Hábitos" variant="ghost" onPress={() => router.push("/habits")} style={styles.controlButton} />
            <NexusButton label="Planejar semana" variant="ghost" onPress={() => router.push("/week")} style={styles.controlButton} />
            <NexusButton label="Refazer diagnóstico" variant="ghost" onPress={() => router.push("/discovery")} style={styles.controlButton} />
          </View>
        </Section>

        <Section title="Seu comando" subtitle="As alterações entram nos próximos planejamentos.">
          <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
          <Field label="Como o Nexus chama você" value={nickname} onChangeText={setNickname} maxLength={40} />
          <Field label="Grande missão" value={goal} onChangeText={setGoal} multiline maxLength={600} />
          <Field label="Minutos disponíveis por dia" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
          <Field label="Rotina" value={schedule} onChangeText={setSchedule} multiline maxLength={600} />
          <View style={styles.choiceGroup}>
            <NexusText variant="caption" secondary>Dias ativos</NexusText>
            <View style={styles.chips}>
              {profileDays.map((day) => {
                const selected = profile.activeDays.includes(day.value);
                const nextDays = selected
                  ? profile.activeDays.filter((item) => item !== day.value)
                  : [...profile.activeDays, day.value].sort() as Weekday[];
                return <ChoiceChip key={day.value} label={day.label} selected={selected} onPress={() => nextDays.length > 0 && updateProfile({ activeDays: nextDays })} />;
              })}
            </View>
          </View>
          <ProfileChoice title="Máximo diário" value={profile.maxDailyTasks} options={[[2, "2 tarefas"], [3, "3 tarefas"], [4, "4 tarefas"], [5, "5 tarefas"]]} onChange={(value) => updateProfile({ maxDailyTasks: Number(value) })} />
          <ProfileChoice title="Intensidade" value={profile.intensity} options={[["leve", "Leve"], ["equilibrado", "Equilibrado"], ["intenso", "Intenso"]]} onChange={(value) => updateProfile({ intensity: value as Profile["intensity"] })} />
          <ProfileChoice title="Tom do assistente" value={profile.assistantTone} options={[["direto", "Direto"], ["parceiro", "Parceiro"], ["treinador", "Treinador"]]} onChange={(value) => updateProfile({ assistantTone: value as Profile["assistantTone"] })} />
          <NexusButton label="Salvar perfil" onPress={saveProfile} fullWidth />
        </Section>

        <Section title="Visual do Nexus" subtitle="Troque completamente o clima do app.">
          <View style={styles.themeGrid}>
            {themes.map((theme) => (
              <Pressable
                key={theme.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: data.preferences.theme === theme.id }}
                onPress={() => updatePreferences({ theme: theme.id })}
                style={[styles.themeCard, { backgroundColor: data.preferences.theme === theme.id ? `${theme.color}18` : colors.surface, borderColor: data.preferences.theme === theme.id ? theme.color : colors.border }]}
              >
                <View style={[styles.themeDot, { backgroundColor: theme.color }]} />
                <NexusText variant="subtitle">{theme.label}</NexusText>
                <NexusText variant="caption" secondary>{theme.description}</NexusText>
              </Pressable>
            ))}
          </View>
          {data.preferences.theme === "custom" ? (
            <>
              <Field label="Cor hexadecimal" value={customAccent} onChangeText={setCustomAccent} maxLength={7} placeholder="#8B5CF6" />
              <NexusButton label="Aplicar cor" variant="secondary" onPress={() => updatePreferences({ customAccent })} />
            </>
          ) : null}
          <SwitchRow label="Movimento reduzido" description="Remove animações que possam incomodar." value={data.preferences.reducedMotion} onChange={(value) => updatePreferences({ reducedMotion: value })} />
          <SwitchRow label="Vibração sutil" description="Feedback ao concluir tarefas." value={data.preferences.haptics} onChange={(value) => updatePreferences({ haptics: value })} />
          <SwitchRow label="Sons" description="Ativa ambientes e efeitos opcionais do Focus OS." value={data.preferences.sound} onChange={(value) => updatePreferences({ sound: value })} />
          <NexusButton label="Abrir personalização completa" variant="secondary" onPress={() => router.push("/customize")} fullWidth />
        </Section>

        <Section title="Widget rápido" subtitle={Platform.OS === "web" ? "Prévia visual. O widget real aparece somente no build Android." : "Ajustes essenciais; use o Studio para tamanhos e layouts avançados."}>
          <WidgetPreview />
          <View style={styles.chips}>
            {(["solid", "amoled", "translucent"] as const).map((background) => <ChoiceChip key={background} label={{ solid: "Sólido", amoled: "AMOLED", translucent: "Translúcido" }[background]} selected={data.preferences.widget.background === background} onPress={() => updatePreferences({ widget: { background } })} />)}
          </View>
          <SwitchRow label="Mostrar mascote" value={data.preferences.widget.showMascot} onChange={(value) => updatePreferences({ widget: { showMascot: value } })} />
          <SwitchRow label="Mostrar missão" value={data.preferences.widget.showMission} onChange={(value) => updatePreferences({ widget: { showMission: value } })} />
          <SwitchRow label="Mostrar sequência" value={data.preferences.widget.showStreak} onChange={(value) => updatePreferences({ widget: { showStreak: value } })} />
          <SwitchRow label="Modo privacidade" description="Esconde títulos reais no widget." value={data.preferences.widget.privacyMode} onChange={(value) => updatePreferences({ widget: { privacyMode: value } })} />
          <View style={styles.chips}>{([1, 2, 3] as const).map((count) => <ChoiceChip key={count} label={`${count} tarefa${count > 1 ? "s" : ""}`} selected={data.preferences.widget.taskCount === count} onPress={() => updatePreferences({ widget: { taskCount: count } })} />)}</View>
          <View style={styles.chips}>
            <ChoiceChip label="Progresso em barra" selected={data.preferences.widget.progressStyle === "bar"} onPress={() => updatePreferences({ widget: { progressStyle: "bar" } })} />
            <ChoiceChip label="Progresso em texto" selected={data.preferences.widget.progressStyle === "text"} onPress={() => updatePreferences({ widget: { progressStyle: "text" } })} />
          </View>
          <NexusButton label="Abrir Widget Studio" variant="secondary" onPress={() => router.push("/widget-studio")} fullWidth />
        </Section>

        <Section title="Lembrete diário" subtitle="O pedido de permissão acontece apenas quando você ativa.">
          <Field label="Horário" value={notificationTime} onChangeText={setNotificationTime} maxLength={5} placeholder="18:00" />
          <SwitchRow label="Notificação diária" description="Nexus online: sua missão de hoje está pronta." value={data.preferences.notificationEnabled} onChange={(value) => void setReminder(value)} />
          {Platform.OS === "web" ? <NexusText variant="caption" secondary>Configure lembretes no APK Android. O preview web continua funcionando sem notificações.</NexusText> : null}
        </Section>

        <Section title="Inteligência" subtitle="A chave nunca é enviada para este dispositivo.">
          <Card style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: status?.configured ? colors.success : status ? colors.warning : colors.textSecondary }]} />
            <View style={styles.flex}>
              <NexusText variant="subtitle">{status?.configured ? "OpenRouter configurado" : status ? "Modo local disponível" : "Status indisponível"}</NexusText>
              <NexusText variant="caption" secondary>{status?.configured ? `${status.primaryModel} → ${status.fallback}` : "O app continuará útil mesmo sem conexão."}</NexusText>
            </View>
          </Card>
        </Section>

        <Section title="Backup e privacidade" subtitle="Seus dados ficam localmente até você exportá-los.">
          <NexusButton label="Exportar dados em JSON" variant="secondary" onPress={() => void exportData()} fullWidth />
          <NexusButton label="Importar backup" variant="ghost" onPress={() => void importData()} fullWidth />
          <Card style={styles.privacyCard}>
            <NexusText variant="subtitle">Privacidade por padrão</NexusText>
            <NexusText variant="caption" secondary>Perfil, tarefas, XP e histórico permanecem no armazenamento privado do app. Somente os campos necessários ao planejamento são enviados ao servidor. A chave da IA vive exclusivamente no ambiente do backend.</NexusText>
          </Card>
          <NexusButton label="Ler política completa" variant="ghost" onPress={() => router.push("/privacy" as never)} fullWidth />
        </Section>

        <Section title="Zona de controle" subtitle="Ações destrutivas sempre pedem confirmação.">
          <NexusButton label="Reiniciar somente o plano de hoje" variant="ghost" onPress={() => setResetTodayOpen(true)} fullWidth />
          <NexusButton label="Apagar todos os dados" variant="danger" onPress={() => setResetAllOpen(true)} fullWidth />
        </Section>

        {message ? <Card style={[styles.message, { borderColor: `${colors.primary}55` }]}><NexusText variant="caption">{message}</NexusText></Card> : null}
        <NexusText variant="caption" secondary style={styles.footer}>Nexus AI 2.0 • Personal Mission OS • Gustavo Araújo</NexusText>
      </Screen>

      <ConfirmDialog visible={resetTodayOpen} title="Reiniciar o plano de hoje?" message="O plano atual será substituído por uma versão local. Seu perfil e histórico não serão apagados." confirmLabel="Reiniciar plano" onCancel={() => setResetTodayOpen(false)} onConfirm={() => { resetToday(); setResetTodayOpen(false); }} />
      <ConfirmDialog visible={resetAllOpen} title="Apagar tudo do Nexus?" message="Perfil, tarefas, XP, sessões e histórico serão removidos deste dispositivo. Exporte um backup antes se quiser recuperar depois." confirmLabel="Apagar tudo" destructive onCancel={() => setResetAllOpen(false)} onConfirm={() => { setResetAllOpen(false); void resetAll().then(() => router.replace("/onboarding")); }} />
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionTitle}><NexusText variant="title">{title}</NexusText>{subtitle ? <NexusText variant="caption" secondary>{subtitle}</NexusText> : null}</View>{children}</View>;
}

function ProfileChoice({ title, value, options, onChange }: { title: string; value: string | number; options: (readonly [string | number, string])[]; onChange: (value: string | number) => void }) {
  return <View style={styles.choiceGroup}><NexusText variant="caption" secondary>{title}</NexusText><View style={styles.chips}>{options.map(([optionValue, label]) => <ChoiceChip key={String(optionValue)} label={label} selected={value === optionValue} onPress={() => onChange(optionValue)} />)}</View></View>;
}

function SwitchRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useNexus();
  return (
    <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
      <View style={styles.flex}><NexusText variant="subtitle">{label}</NexusText>{description ? <NexusText variant="caption" secondary>{description}</NexusText> : null}</View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  avatar: { width: 92, height: 92, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  section: { marginTop: 27, gap: 13 },
  sectionTitle: { gap: 4 },
  choiceGroup: { gap: 9 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  themeCard: { width: "48%", flexGrow: 1, minHeight: 118, borderRadius: 18, borderWidth: 1, padding: 14, gap: 7 },
  themeDot: { width: 22, height: 22, borderRadius: 8 },
  switchRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  privacyCard: { gap: 7 },
  message: { marginTop: 22 },
  footer: { textAlign: "center", marginTop: 28, marginBottom: 8 },
  controlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  controlButton: { width: "48%", flexGrow: 1 },
});
