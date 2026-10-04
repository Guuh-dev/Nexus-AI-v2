import { useState } from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { useNexus } from "@/providers/NexusProvider";
import type { ChatThread } from "@/types";
export function AssistanceProposalCard({ thread, onStart }: { thread: ChatThread; onStart: () => void }) {
  const { colors, assistantBusy, decideChatProposal } = useNexus();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const c = thread.consultation;
  if (!c?.proposal || (c.stage !== "proposed" && c.stage !== "approved" && c.stage !== "adjusting")) return null;
  if (c.stage === "approved" && !expanded) return <Card style={{ gap: 6 }}><NexusText variant="caption" color={colors.success}>✓ Ajuda aprovada · sua proposta ficou salva</NexusText><NexusButton label="Ver proposta aprovada" compact variant="ghost" onPress={() => setExpanded(true)} /></Card>;
  const p = c.proposal;
  const decide = async (approve: boolean) => {
    if (saving || assistantBusy) return;
    setSaving(true); setError("");
    try {
      if (await decideChatProposal(thread.id, c.revision, approve)) { if (approve) onStart(); }
      else setError("Não foi possível salvar sua decisão. Tente novamente.");
    } catch { setError("A proposta mudou ou não pôde ser salva. Revise e tente novamente."); }
    finally { setSaving(false); }
  };
  return <Card style={{ gap: 12, borderColor: thread.kind === "professor" ? colors.success : colors.primary }}>
    {c.stage === "approved" && <NexusButton label="Recolher proposta" compact variant="ghost" onPress={() => setExpanded(false)} />}
    <NexusText variant="mono" color={thread.kind === "professor" ? colors.success : colors.primary}>ENTENDIMENTO E PROPOSTA</NexusText>
    {([["O que você quer", p.understanding], ["Seu contexto", p.context], ["Resultado desejado", p.outcome], ["Como vamos começar", p.approach], ["Entrega", p.deliverable], ["Tempo disponível", p.timeFit]] as const).map(([label, text]) => <View key={label} style={{ gap: 3 }}><NexusText variant="subtitle">{label}</NexusText><NexusText variant="caption" secondary>{text}</NexusText></View>)}
    {p.uncertainties.length > 0 && <View style={{ gap: 3 }}><NexusText variant="subtitle">Ainda precisamos confirmar</NexusText>{p.uncertainties.map((text, i) => <NexusText key={i} variant="caption" secondary>• {text}</NexusText>)}</View>}
    {error !== "" && <NexusText variant="caption" color={colors.warning} accessibilityLiveRegion="polite">{error}</NexusText>}
    {c.stage === "proposed" ? <View style={{ gap: 8 }}><NexusButton label={saving ? "Salvando decisão…" : "Aprovar e começar"} fullWidth disabled={saving || assistantBusy} onPress={() => { void decide(true); }} /><NexusButton label="Quero ajustar" variant="ghost" fullWidth disabled={saving || assistantBusy} onPress={() => { void decide(false); }} /></View> : <NexusText variant="caption" color={c.stage === "approved" ? colors.success : colors.textSecondary}>{c.stage === "approved" ? "Proposta aprovada. Podemos continuar por ela." : "Conte no campo abaixo o que quer mudar. As partes que você aprovou continuam como referência."}</NexusText>}
  </Card>;
}
