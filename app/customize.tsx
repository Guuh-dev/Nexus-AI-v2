import { StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import { NEXUS_THEMES, resolveThemeId, type CoreThemeId } from "@/theme/theme";
import type {
  AssistantVerbosity,
  AtlasPersonality,
  CompanionMood,
  CompanionPresence,
  Preferences,
} from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

const MOODS: readonly (readonly [CompanionMood, string])[] = [
  ["happy", "Feliz"],
  ["playful", "Zoeiro"],
  ["motivational", "Motivador"],
  ["serious", "Sério"],
  ["strict", "Bravo"],
  ["calm", "Calmo"],
  ["quiet", "Quieto"],
];

const PRESENCE: readonly (readonly [CompanionPresence, string])[] = [
  ["quiet", "Discreto"],
  ["balanced", "Equilibrado"],
  ["active", "Presente"],
];

const ATLAS_STYLES: readonly (readonly [AtlasPersonality, string])[] = [
  ["teacher", "Professor"],
  ["mentor", "Mentor"],
  ["coach", "Prático"],
  ["strict", "Exigente"],
  ["friendly", "Amigável"],
];

const RESPONSE_LENGTH: readonly (readonly [AssistantVerbosity, string])[] = [
  ["compact", "Curta"],
  ["balanced", "Equilibrada"],
  ["detailed", "Detalhada"],
];

function back() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/profile");
}

export default function CustomizeScreen() {
  const { data, colors, updatePreferences } = useNexus();
  const mascot = data.preferences.mascot;
  const activeTheme = resolveThemeId(String(data.preferences.theme));
  const setTheme = (theme: CoreThemeId) => {
    void updatePreferences({ theme: theme as Preferences["theme"] });
  };

  return (
    <Screen maxWidth={760}>
      <View style={styles.header}>
        <NexusButton label="Voltar" variant="ghost" onPress={back} />
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>APARÊNCIA E VOZ</NexusText>
          <NexusText variant="display">Um Nexus, seis identidades.</NexusText>
        </View>
        <CompanionMascot mascot={mascot.companion} size={54} />
      </View>
      <NexusText secondary>
        As escolhas abaixo afetam o produto inteiro. A configuração de cada widget continua no Widget Studio.
      </NexusText>

      <Section title="Tema" subtitle="Cada opção define cores, superfícies, contraste, cantos e profundidade.">
        <View style={styles.themeGrid}>
          {Object.values(NEXUS_THEMES).map((theme) => {
            const selected = activeTheme === theme.id;
            return (
              <Card
                key={theme.id}
                style={[
                  styles.themeCard,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.surfaceRaised : colors.surface,
                  },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.flex}>
                  <NexusText variant="subtitle">{theme.label}</NexusText>
                  <NexusText variant="caption" secondary>{theme.description}</NexusText>
                </View>
                <NexusButton
                  label={selected ? "Ativo" : "Usar"}
                  variant={selected ? "secondary" : "ghost"}
                  compact
                  onPress={() => setTheme(theme.id)}
                />
              </Card>
            );
          })}
        </View>
      </Section>

      <Section title="Companion" subtitle="Personalidade e presença; sem inferir emoções que você não registrou.">
        <Toggle
          label="Mostrar Companion no Hoje"
          description="Permite a presença visual; o nível abaixo decide quando ela aparece."
          value={mascot.showCompanion}
          onChange={(value) => void updatePreferences({ mascot: { showCompanion: value } })}
        />
        <Choice title="Personalidade" options={MOODS} value={mascot.companionMood} onChange={(value) => void updatePreferences({ mascot: { companionMood: value as CompanionMood } })} />
        <Choice title="Presença" options={PRESENCE} value={mascot.companionPresence} onChange={(value) => void updatePreferences({ mascot: { companionPresence: value as CompanionPresence } })} />
        <Toggle
          label="Falas do Companion"
          description="Desative para manter apenas o mascote e os estados visuais."
          value={mascot.speechEnabled}
          onChange={(value) => void updatePreferences({ mascot: { speechEnabled: value } })}
        />
      </Section>

      <Section title="Professor Atlas" subtitle="A voz muda; evidências, entregas e critérios continuam obrigatórios.">
        <Choice title="Estilo" options={ATLAS_STYLES} value={mascot.atlasPersonality} onChange={(value) => void updatePreferences({ mascot: { atlasPersonality: value as AtlasPersonality } })} />
        <Choice title="Respostas" options={RESPONSE_LENGTH} value={mascot.assistantVerbosity} onChange={(value) => void updatePreferences({ mascot: { assistantVerbosity: value as AssistantVerbosity } })} />
      </Section>

      <Section title="Conforto" subtitle="Preferências simples e aplicadas em todo o aplicativo.">
        <Toggle
          label="Reduzir movimento"
          description="Evita animações e transições que não ajudam na execução."
          value={data.preferences.reducedMotion}
          onChange={(value) => void updatePreferences({ reducedMotion: value })}
        />
        <Toggle
          label="Resposta tátil"
          description="Confirma ações importantes em aparelhos compatíveis."
          value={data.preferences.haptics}
          onChange={(value) => void updatePreferences({ haptics: value })}
        />
        <Toggle
          label="Som no foco"
          description="Permite áudio ambiente somente quando você escolher uma faixa."
          value={data.preferences.sound}
          onChange={(value) => void updatePreferences({ sound: value })}
        />
      </Section>
    </Screen>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <NexusText variant="title">{title}</NexusText>
        <NexusText variant="caption" secondary>{subtitle}</NexusText>
      </View>
      {children}
    </View>
  );
}

function Choice({ title, options, value, onChange }: { title: string; options: readonly (readonly [string, string])[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.choice}>
      <NexusText variant="caption" secondary>{title}</NexusText>
      <View style={styles.chips}>
        {options.map(([id, label]) => (
          <ChoiceChip key={id} label={label} selected={value === id} onPress={() => onChange(id)} />
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useNexus();
  return (
    <Card style={styles.toggle}>
      <View style={styles.flex}>
        <NexusText variant="subtitle">{label}</NexusText>
        <NexusText variant="caption" secondary>{description}</NexusText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.text}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  flex: { flex: 1 },
  section: { marginTop: 28, gap: 10 },
  sectionTitle: { gap: 4, marginBottom: 2 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: { width: "48%", minWidth: 250, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 10 },
  choice: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 14 },
});
