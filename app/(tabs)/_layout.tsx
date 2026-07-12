import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { NexusText } from "@/components/ui/NexusText";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

const icons = { today: "◆", brain: "✦", focus: "◎", progress: "▥", profile: "●" } as const;

export default function TabsLayout() {
  const { data, colors, visuals, ready } = useNexus();
  useEffect(() => undefined, []);
  if (!ready) return null;
  if (!data.onboardingCompleted || !data.profile) return <Redirect href="/onboarding" />;
  if (!data.discoveryCompleted) return <Redirect href="/discovery" />;

  return (
    <Tabs
      initialRouteName="today"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primarySoft,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: visuals.borderWidth ? StyleSheet.hairlineWidth : 0,
          elevation: visuals.elevation,
          shadowColor: colors.primary,
          shadowOpacity: visuals.shadowOpacity,
          shadowRadius: visuals.shadowRadius,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color }) => (
          <View style={[styles.icon, focused && { backgroundColor: `${colors.primary}${visuals.tabActiveFill}`, borderRadius: Math.max(6, visuals.buttonRadius - 4) }]}>
            <NexusText color={String(color)} variant="caption">{icons[route.name as keyof typeof icons] ?? "•"}</NexusText>
          </View>
        ),
      })}
    >
      <Tabs.Screen name="today" options={{ title: "Hoje" }} />
      <Tabs.Screen name="brain" options={{ title: "Brain" }} />
      <Tabs.Screen name="focus" options={{ title: "Foco" }} />
      <Tabs.Screen name="progress" options={{ title: "Progresso" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { width: 36, height: 27, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
