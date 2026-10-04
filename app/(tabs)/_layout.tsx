import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { NexusIcon, type NexusIconName } from "@/components/ui/NexusIcon";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

export default function TabsLayout() {
  const { data, colors, visuals, ready } = useNexus();
  if (!ready) return null;
  if (!data.onboardingCompleted || !data.profile)
    return <Redirect href="/onboarding" />;
  if (!data.discoveryCompleted) return <Redirect href="/discovery" />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Tabs
        initialRouteName="today"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.background },
          tabBarBackground: () => (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.tabBar },
              ]}
            />
          ),
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
            paddingBottom: 12,
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: visuals.borderWidth ? StyleSheet.hairlineWidth : 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: "600", letterSpacing: 0.1 },
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.icon,
                focused && {
                  backgroundColor: `${colors.primary}${visuals.tabActiveFill}`,
                  borderRadius: Math.max(6, visuals.chipRadius + 4),
                },
              ]}
            >
              <NexusIcon name={route.name as NexusIconName} color={focused ? colors.primarySoft : String(color)} size={22} />
            </View>
          ),
        })}
      >
        <Tabs.Screen name="today" options={{ title: "Hoje" }} />
        <Tabs.Screen name="plan" options={{ title: "Plano" }} />
        <Tabs.Screen name="focus" options={{ title: "Foco" }} />
        <Tabs.Screen name="brain" options={{ title: "Brain" }} />
        <Tabs.Screen name="progress" options={{ title: "Progresso" }} />
      </Tabs>
      <View
        pointerEvents="none"
        style={[styles.systemBarGuard, { backgroundColor: colors.tabBar }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  systemBarGuard: { height: 2, width: "100%" },
  icon: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
