import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { NexusButton } from "@/components/ui/NexusButton";
import { PixelMascot } from "@/components/PixelMascot";
import { ProgressRing } from "@/components/ProgressRing";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { categoryDistribution, weeklyStats } from "@/features/progress/stats";
import { useNexus } from "@/providers/NexusProvider";
import { formatShortDate } from "@/utils/dates";
import { calculateLevel } from "@/utils/levels";

export { RouteErrorBoundary as ErrorBoundary };

type ProgressView = "resumo" | "desafios" | "historico";
const CATEGORY_LABELS = { desenvolvimento: "Desenvolvimento", estudos: "Estudos", dinheiro: "Dinheiro", saude: "Saúde", organizacao: "Organização", pessoal: "Pessoal" } as const;

export default function ProgressScreen() {
  const { data, colors, assistantBusy, generateWeeklyReview } = useNexus();
  const [view, setView] = useState<ProgressView>("resumo");
  const weekly = weeklyStats(data);
  const level = calculateLevel(data.progress.totalXp);
  const categories = categoryDistribution(data);
  const completedMissions = data.history.filter((day) => day.plan.mainMission.completed).slice(-10).reverse();
  const latestReview = data.weeklyReviews.at(-1);
  const maxAttribute = Math.max(1, ...Object.values(data.progress.attributes));
  const activeChallenges = data.progress.challenges.filter((challenge) => new Date(challenge.expiresAt).getTime() >= Date.now() - 86_400_000);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>TELEMETRIA</NexusText>
          <NexusText variant="display">Seu progresso real.</NexusText>
          <NexusText secondary>Métricas em áreas separadas, sem transformar evolução numa parede de números.</NexusText>
        </View>
        <PixelMascot state={weekly.completion >= 70 ? "celebrating" : "idle"} size={58} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ChoiceChip label="Resumo" selected={view === "resumo"} onPress={() => setView("resumo")} />
        <ChoiceChip label={`Desafios ${activeChallenges.length}`} selected={view === "desafios"} onPress={() => setView("desafios")} />
        <ChoiceChip label="Histórico" selected={view === "historico"} onPress={() => setView("historico")} />
      </View>

      {view === "resumo" ? (
        <>
          <Card style={styles.levelCard}>
            <ProgressRing progress={level.progress} size={138} label={String(level.level)} />
            <View style={styles.levelInfo}>
              <NexusText variant="mono" color={colors.primarySoft}>NÍVEL {level.level}</NexusText>
              <NexusText variant="title">{level.title}</NexusText>
              <NexusText secondary>{data.progress.totalXp} XP total</NexusText>
              <ProgressBar progress={level.progress} />
              <NexusText variant="caption" secondary>{level.nextLevelXp - data.progress.totalXp} XP para o próximo nível</NexusText>
            </View>
          </Card>

          <View style={styles.metrics}>
            <Metric value={`${weekly.completion}%`} label="Conclusão semanal" />
            <Metric value={String(weekly.xp)} label="XP na semana" />
            <Metric value={`${weekly.focusMinutes}m`} label="Foco na semana" />
            <Metric value={`${weekly.daysCompleted}/7`} label="Dias completos" />
          </View>

          <View style={styles.section}>
            <NexusText variant="title">Últimos sete dias</NexusText>
            <Card style={styles.chart}>
              {weekly.days.map((day) => (
                <View key={day.date} style={styles.barColumn}>
                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={[styles.barFill, { height: `${Math.max(4, day.percentage)}%`, backgroundColor: day.percentage >= 70 ? colors.success : colors.primary }]} />
                  </View>
                  <NexusText variant="caption" secondary>{formatShortDate(day.date).slice(0, 2)}</NexusText>
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.streakRow}>
            <Card style={styles.streakCard}><NexusText color={colors.warning} variant="display">♨ {data.progress.currentStreak}</NexusText><NexusText variant="caption" secondary>Sequência atual</NexusText></Card>
            <Card style={styles.streakCard}><NexusText variant="display">{data.progress.bestStreak}</NexusText><NexusText variant="caption" secondary>Melhor sequência</NexusText></Card>
          </View>

          <View style={styles.section}>
            <NexusText variant="title">Atributos do executor</NexusText>
            <Card style={styles.categoryCard}>
              {Object.entries(data.progress.attributes).map(([name, value]) => (
                <View key={name} style={styles.categoryRow}>
                  <View style={styles.categoryTop}>
                    <NexusText variant="subtitle">{({ foco: "Foco", execucao: "Execução", consistencia: "Consistência", disciplina: "Disciplina" } as Record<string, string>)[name]}</NexusText>
                    <NexusText variant="mono" color={colors.primarySoft}>{value}</NexusText>
                  </View>
                  <ProgressBar progress={value / maxAttribute} height={7} />
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.section}>
            <NexusText variant="title">Distribuição por categoria</NexusText>
            <Card style={styles.categoryCard}>
              {categories.length ? categories.map((item) => (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryTop}><NexusText variant="caption">{CATEGORY_LABELS[item.category]}</NexusText><NexusText variant="caption" secondary>{item.count} • {item.percentage}%</NexusText></View>
                  <ProgressBar progress={item.percentage / 100} height={6} />
                </View>
              )) : <NexusText secondary>Conclua tarefas para revelar sua distribuição.</NexusText>}
            </Card>
          </View>
        </>
      ) : null}

      {view === "desafios" ? (
        <>
          <View style={styles.sectionFirst}>
            <View style={styles.sectionHeader}>
              <View style={styles.flex}><NexusText variant="title">Revisão semanal com IA</NexusText><NexusText variant="caption" secondary>Padrões, consistência e próximo desafio.</NexusText></View>
              <PixelMascot state={assistantBusy ? "thinking" : "idle"} size={44} />
            </View>
            <NexusButton label={latestReview ? "Atualizar revisão" : "Criar minha revisão"} loading={assistantBusy} onPress={() => void generateWeeklyReview()} fullWidth />
            {latestReview ? (
              <Card style={styles.review}>
                <View style={styles.categoryTop}><NexusText variant="mono" color={latestReview.source === "ai" ? colors.success : colors.warning}>{latestReview.source === "ai" ? "ANÁLISE NEXUS" : "ANÁLISE LOCAL"}</NexusText><NexusText variant="title">{latestReview.consistencyScore}/100</NexusText></View>
                <NexusText variant="title">Foco da próxima semana</NexusText>
                <NexusText>{latestReview.nextWeekFocus}</NexusText>
                <ProgressBar progress={latestReview.consistencyScore / 100} color={latestReview.consistencyScore >= 70 ? colors.success : colors.warning} />
                <ReviewList title="O que funcionou" items={latestReview.keep} />
                <ReviewList title="Padrões observados" items={latestReview.patterns} />
                <ReviewList title="O que cortar" items={latestReview.cut} />
                <Card style={[styles.challenge, { backgroundColor: `${colors.primary}10` }]}><NexusText variant="mono" color={colors.primarySoft}>DESAFIO DA SEMANA</NexusText><NexusText variant="subtitle">{latestReview.challenge}</NexusText></Card>
              </Card>
            ) : <Card><NexusText secondary>Gere a primeira revisão quando houver dados suficientes. O fallback local funciona sem IA.</NexusText></Card>}
          </View>

          <View style={styles.section}>
            <NexusText variant="title">Desafios ativos</NexusText>
            <View style={styles.achievementGrid}>
              {activeChallenges.length ? activeChallenges.map((challenge) => (
                <Card key={challenge.id} style={[styles.achievement, { borderColor: challenge.completed ? `${colors.success}55` : challenge.type === "boss" ? `${colors.danger}55` : colors.border }]}>
                  <NexusText variant="mono" color={challenge.type === "boss" ? colors.danger : colors.primarySoft}>{challenge.type === "boss" ? "BOSS" : challenge.type.toUpperCase()}</NexusText>
                  <NexusText variant="subtitle">{challenge.title}</NexusText>
                  <NexusText variant="caption" secondary>{challenge.description}</NexusText>
                  <ProgressBar progress={Math.min(1, challenge.progress / challenge.target)} color={challenge.completed ? colors.success : colors.primary} />
                  <NexusText variant="caption" color={challenge.completed ? colors.success : colors.textSecondary}>{challenge.completed ? `✓ +${challenge.xpReward} XP` : `${challenge.progress}/${challenge.target}`}</NexusText>
                </Card>
              )) : <Card><NexusText secondary>Nenhum desafio ativo. O modo escolhido no diagnóstico controla a intensidade.</NexusText></Card>}
            </View>
          </View>
        </>
      ) : null}

      {view === "historico" ? (
        <>
          <View style={styles.sectionFirst}>
            <NexusText variant="title">Conquistas</NexusText>
            <View style={styles.achievementGrid}>
              {data.progress.achievements.length ? data.progress.achievements.map((achievement) => (
                <Card key={achievement.id} style={styles.achievement}>
                  <NexusText variant="display" color={colors.primarySoft}>{achievement.icon}</NexusText>
                  <NexusText variant="subtitle">{achievement.title}</NexusText>
                  <NexusText variant="caption" secondary>{achievement.description}</NexusText>
                </Card>
              )) : <Card><NexusText secondary>Suas primeiras conquistas aparecerão ao executar tarefas e sessões de foco.</NexusText></Card>}
            </View>
          </View>

          <View style={styles.section}>
            <NexusText variant="title">Missões recentes</NexusText>
            <Card style={styles.missionList}>
              {completedMissions.length ? completedMissions.map((day) => (
                <View key={`${day.date}-${day.plan.requestId}`} style={[styles.missionRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.done, { backgroundColor: colors.success }]}><NexusText color="#06120A">✓</NexusText></View>
                  <View style={styles.flex}><NexusText variant="subtitle" numberOfLines={1}>{day.plan.mainMission.title}</NexusText><NexusText variant="caption" secondary>{formatShortDate(day.date)} • {day.xpEarned} XP</NexusText></View>
                </View>
              )) : <NexusText secondary>Nenhuma missão principal arquivada ainda. A primeira está esperando hoje.</NexusText>}
            </Card>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <Card style={styles.metric}><NexusText variant="title">{value}</NexusText><NexusText variant="caption" secondary style={styles.center}>{label}</NexusText></Card>;
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return <View style={styles.reviewList}><NexusText variant="subtitle">{title}</NexusText>{items.map((item, index) => <NexusText key={`${title}-${index}`} variant="caption" secondary>• {item}</NexusText>)}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, borderWidth: 1, borderRadius: 18, padding: 8, marginBottom: 18 },
  levelCard: { flexDirection: "row", alignItems: "center", gap: 20 },
  levelInfo: { flex: 1, gap: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metric: { width: "48%", flexGrow: 1, minHeight: 92, alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 8 },
  center: { textAlign: "center" },
  section: { marginTop: 25, gap: 12 },
  sectionFirst: { gap: 12 },
  chart: { height: 210, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  barColumn: { flex: 1, alignItems: "center", gap: 8 },
  barTrack: { width: "100%", maxWidth: 36, height: 150, borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 10 },
  streakRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  streakCard: { flex: 1, alignItems: "center", gap: 3 },
  categoryCard: { gap: 16 },
  categoryRow: { gap: 7 },
  categoryTop: { flexDirection: "row", justifyContent: "space-between" },
  achievementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  achievement: { width: "48%", flexGrow: 1, minHeight: 150, gap: 6 },
  missionList: { gap: 2 },
  missionRow: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth },
  done: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  review: { gap: 13 },
  reviewList: { gap: 5 },
  challenge: { gap: 7 },
});
