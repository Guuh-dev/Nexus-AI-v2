import { Component, useState, type ErrorInfo, type PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, type ErrorBoundaryProps } from "expo-router";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { PixelMascot } from "@/components/PixelMascot";
import { useNexus } from "@/providers/NexusProvider";

type Props = PropsWithChildren<{ onClearTemporary: () => Promise<void> }>;
type State = { error: Error | null };

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error("Nexus render boundary", error.name, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorFallback
        error={this.state.error}
        onRetry={() => this.setState({ error: null })}
        onHome={() => {
          this.setState({ error: null });
          router.replace("/");
        }}
        onClear={async () => {
          await this.props.onClearTemporary();
          this.setState({ error: null });
        }}
      />
    );
  }
}

function ErrorFallback({ error, onRetry, onHome, onClear }: { error: Error; onRetry: () => void; onHome: () => void; onClear: () => void }) {
  const [details, setDetails] = useState(false);
  const { colors } = useNexus();
  return (
    <View style={[styles.fallback, { backgroundColor: colors.background }]}>
      <PixelMascot state="warning" size={64} />
      <NexusText variant="display" style={styles.center}>Algo deu errado</NexusText>
      <NexusText secondary style={styles.center}>Não foi possível carregar esta tela.</NexusText>
      <View style={styles.actions}>
        <NexusButton label="Tentar novamente" onPress={onRetry} fullWidth />
        <NexusButton label="Voltar ao início" onPress={onHome} variant="secondary" fullWidth />
        <NexusButton label="Limpar somente os dados temporários" onPress={onClear} variant="ghost" fullWidth />
      </View>
      {__DEV__ ? (
        <View style={styles.detailsWrap}>
          <Pressable accessibilityRole="button" onPress={() => setDetails((value) => !value)}>
            <NexusText variant="caption">{details ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}</NexusText>
          </Pressable>
          {details ? (
            <ScrollView style={[styles.details, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <NexusText variant="caption" secondary selectable>{`${error.name}: ${error.message}\n${error.stack ?? ""}`}</NexusText>
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function AppErrorBoundary({ children }: PropsWithChildren) {
  const { clearTemporary } = useNexus();
  return <GlobalErrorBoundary onClearTemporary={clearTemporary}>{children}</GlobalErrorBoundary>;
}

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { clearTemporary } = useNexus();
  return <ErrorFallback error={error} onRetry={retry} onHome={() => router.replace("/")} onClear={() => void clearTemporary()} />;
}

const styles = StyleSheet.create({
  fallback: { flex: 1, minHeight: "100%", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  center: { textAlign: "center" },
  actions: { width: "100%", maxWidth: 420, gap: 10, marginTop: 16 },
  detailsWrap: { width: "100%", maxWidth: 620, marginTop: 20, gap: 10 },
  details: { maxHeight: 180, padding: 12, borderWidth: 1, borderRadius: 12 },
});
