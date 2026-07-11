import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";

export function NotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let remove: (() => void) | undefined;
    void import("expo-notifications").then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const route = response.notification.request.content.data?.route;
        if (route === "/today") router.push("/(tabs)/today");
      });
      remove = () => subscription.remove();
    });
    return () => remove?.();
  }, []);
  return null;
}
