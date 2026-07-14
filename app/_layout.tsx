import "@/global.css";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  AppErrorBoundary,
  RouteErrorBoundary,
} from "@/components/ErrorBoundary";
import { Toast } from "@/components/Toast";
import { NotificationBootstrap } from "@/components/NotificationBootstrap";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { NexusProvider, useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

function Navigation() {
  const { colors, data, ready, storageReadOnlyReason } = useNexus();

  if (!ready) return null;
  if (storageReadOnlyReason) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Card style={{ gap: 12, maxWidth: 560, width: "100%", alignSelf: "center" }}>
          <NexusText variant="mono" color={colors.warning}>
            DADOS PROTEGIDOS
          </NexusText>
          <NexusText variant="display">Seus dados foram preservados.</NexusText>
          <NexusText secondary>{storageReadOnlyReason}</NexusText>
          <NexusText variant="caption" secondary>
            Esta instalação ficou somente leitura para evitar sobrescrever o estado original. Nenhuma alteração foi gravada.
          </NexusText>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={data.preferences.theme === "light" ? "dark" : "light"} />
      <NavigationBar style={data.preferences.theme === "light" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="discovery" />
        <Stack.Screen name="professor-intake" />
        <Stack.Screen name="loading-plan" options={{ gestureEnabled: false }} />
        <Stack.Screen name="customize" />
        <Stack.Screen name="widget-studio" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <NotificationBootstrap />
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
      <SafeAreaProvider>
        <NexusProvider>
          <AppErrorBoundary>
            <Navigation />
          </AppErrorBoundary>
        </NexusProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
