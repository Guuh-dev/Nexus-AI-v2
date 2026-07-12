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
import { NexusProvider, useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

function Navigation() {
  const { colors, data } = useNexus();

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
        <Stack.Screen name="operations" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="week" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="finance" />
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
