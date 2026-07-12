import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";

function parseNumber(value: string): number {
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function FinanceScreen() {
  const { data, colors, updateFinance } = useNexus();
  const finance = data.finance;
  const [goal, setGoal] = useState(String(finance.monthlyGoal));
  const [revenue, setRevenue] = useState(String(finance.monthlyRevenue));

  useEffect(() => {
    setGoal(String(finance.monthlyGoal));
    setRevenue(String(finance.monthlyRevenue));
  }, [finance.monthlyGoal, finance.monthlyRevenue]);

  const percentage = useMemo(
    () => finance.monthlyGoal > 0 ? Math.min(100, Math.round((finance.monthlyRevenue / finance.monthlyGoal) * 100)) : 0,
    [finance.monthlyGoal, finance.monthlyRevenue],
  );

  return (
    <Screen maxWidth={820}>
      <View style={styles.header}>
        <NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} />
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>FREELANCE SCOREBOARD</NexusText>
          <NexusText variant="display">Dinheiro também é missão.</NexusText>
        </View>
        <CompanionMascot mascot="byte" state={percentage >= 100 ? "celebrating" : "idle"} size={60} />
      </View>

      <Card style={[styles.hero, { borderColor: `${colors.success}55`, backgroundColor: `${colors.success}0C` }]}>
        <View style={styles.rowBetween}>
          <View>
            <NexusText variant="caption" secondary>RECEITA DO MÊS</NexusText>
            <NexusText variant="display">R$ {finance.monthlyRevenue.toLocaleString("pt-BR")}</NexusText>
          </View>
          <NexusText variant="title" color={colors.success}>{percentage}%</NexusText>
        </View>
        <ProgressBar progress={percentage / 100} color={colors.success} height={9} />
        <NexusText variant="caption" secondary>
          Meta: R$ {finance.monthlyGoal.toLocaleString("pt-BR")} • faltam R$ {Math.max(0, finance.monthlyGoal - finance.monthlyRevenue).toLocaleString("pt-BR")}
        </NexusText>
      </Card>

      <View style={styles.metrics}>
        <Metric label="Prospects hoje" value={finance.prospectsToday} onMinus={() => updateFinance({ prospectsToday: Math.max(0, finance.prospectsToday - 1) })} onPlus={() => updateFinance({ prospectsToday: finance.prospectsToday + 1 })} />
        <Metric label="Follow-ups" value={finance.followUpsPending} onMinus={() => updateFinance({ followUpsPending: Math.max(0, finance.followUpsPending - 1) })} onPlus={() => updateFinance({ followUpsPending: finance.followUpsPending + 1 })} />
        <Metric label="Clientes ativos" value={finance.activeClients} onMinus={() => updateFinance({ activeClients: Math.max(0, finance.activeClients - 1) })} onPlus={() => updateFinance({ activeClients: finance.activeClients + 1 })} />
        <Metric label="Fechamentos" value={finance.closedDeals} onMinus={() => updateFinance({ closedDeals: Math.max(0, finance.closedDeals - 1) })} onPlus={() => updateFinance({ closedDeals: finance.closedDeals + 1 })} />
      </View>

      <Card style={styles.form}>
        <NexusText variant="title">Metas do placar</NexusText>
        <Field label="Meta mensal (R$)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="3000" />
        <Field label="Receita atual (R$)" value={revenue} onChangeText={setRevenue} keyboardType="decimal-pad" placeholder="0" />
        <NexusButton label="Salvar placar" onPress={() => updateFinance({ monthlyGoal: parseNumber(goal), monthlyRevenue: parseNumber(revenue) })} fullWidth />
      </Card>

      <Card style={[styles.tip, { backgroundColor: `${colors.primary}0E` }]}>
        <NexusText variant="mono" color={colors.primarySoft}>PRÓXIMA AÇÃO</NexusText>
        <NexusText variant="subtitle">
          {finance.followUpsPending > 0
            ? `Enviar ${Math.min(3, finance.followUpsPending)} follow-up${finance.followUpsPending > 1 ? "s" : ""} agora.`
            : finance.prospectsToday < 10
              ? "Prospectar 10 negócios e registrar as respostas."
              : "Melhorar uma demo e mandar para o prospect mais quente."}
        </NexusText>
      </Card>
    </Screen>
  );
}

function Metric({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <Card style={styles.metric}>
      <NexusText variant="caption" secondary>{label}</NexusText>
      <NexusText variant="display">{value}</NexusText>
      <View style={styles.metricActions}>
        <NexusButton label="−" variant="ghost" onPress={onMinus} style={styles.flex} />
        <NexusButton label="＋" variant="secondary" onPress={onPlus} style={styles.flex} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  hero: { marginTop: 22, gap: 14 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  metric: { width: "47%", minWidth: 145, flexGrow: 1, gap: 8 },
  metricActions: { flexDirection: "row", gap: 8 },
  form: { marginTop: 18, gap: 14 },
  tip: { marginTop: 18, gap: 8 },
});
