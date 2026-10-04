import { useState } from "react";
import { Pressable, View } from "react-native";
import { PixelCharacter } from "@/components/PixelMascot";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";
import type { CompanionMood } from "@/types";
const PERSONALITIES = [["happy", "Feliz"], ["playful", "Zoeiro"], ["motivational", "Motivado"], ["serious", "Sério"], ["strict", "Firme"], ["calm", "Calmo"], ["quiet", "Quieto"]] as const;
export function PersonalityPicker({ kind }: { kind: "nexus" | "atlas" }) {
  const { data, colors, updatePreferences } = useNexus();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mood = kind === "atlas" ? data.preferences.mascot.atlasMood ?? data.preferences.mascot.companionMood : data.preferences.mascot.companionMood;
  const select = async (value: CompanionMood) => {
    if (saving) return;
    setSaving(true); setError("");
    try { await updatePreferences({ mascot: kind === "atlas" ? { atlasMood: value } : { companionMood: value } }); }
    catch { setError("Não foi possível salvar. Tente novamente."); }
    finally { setSaving(false); }
  };
  return <View style={{ gap: 10 }}><NexusText variant="subtitle">Personalidade do {kind === "atlas" ? "Atlas" : "Nexus"}</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{PERSONALITIES.map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${kind === "atlas" ? "Atlas" : "Nexus"}: ${label}`} accessibilityState={{ selected: mood === value, disabled: saving }} disabled={saving} onPress={() => { void select(value); }} style={{ width: 74, minHeight: 88, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: mood === value ? colors.primary : colors.border, backgroundColor: mood === value ? colors.surfaceRaised : colors.surface, alignItems: "center", justifyContent: "center", gap: 4 }}><View accessible={false} importantForAccessibility="no-hide-descendants"><PixelCharacter kind={kind} mood={value} size={48} /></View><NexusText variant="caption" color={mood === value ? colors.primarySoft : colors.textSecondary}>{label}</NexusText></Pressable>)}</View>{saving && <NexusText variant="caption" secondary accessibilityLiveRegion="polite">Salvando personalidade…</NexusText>}{error !== "" && <NexusText variant="caption" color={colors.warning}>{error}</NexusText>}</View>;
}
