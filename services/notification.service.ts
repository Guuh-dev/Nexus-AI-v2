import { Platform } from "react-native";

export type NotificationResult = { supported: boolean; enabled: boolean; reason?: string };

export async function configureDailyReminder(enabled: boolean, time: string): Promise<NotificationResult> {
  if (Platform.OS === "web") return { supported: false, enabled: false, reason: "Lembretes nativos ficam disponíveis no aplicativo Android." };
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return { supported: true, enabled: false };

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status === "undetermined") permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") {
      return { supported: true, enabled: false, reason: "Permissão negada. Você pode ativá-la nas configurações do Android." };
    }

    const timeParts = time.split(":");
    const hourValue = Number(timeParts[0]);
    const minuteValue = Number(timeParts[1]);
    const hour = Number.isFinite(hourValue) ? hourValue : 18;
    const minute = Number.isFinite(minuteValue) ? minuteValue : 0;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("nexus-daily", {
        name: "Missão diária",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 120, 80, 120],
        lightColor: "#8B5CF6",
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nexus online",
        body: "Sua missão de hoje está pronta.",
        data: { route: "/today" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === "android" ? { channelId: "nexus-daily" } : {}),
      },
    });
    return { supported: true, enabled: true };
  } catch {
    return { supported: false, enabled: false, reason: "Não foi possível configurar o lembrete neste build." };
  }
}
