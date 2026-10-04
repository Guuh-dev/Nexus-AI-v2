import { describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ cancelled: [] as string[], scheduled: [] as { content: { title: string; body: string; data: { category: string } } }[] }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({
 getAllScheduledNotificationsAsync: async () => [
   { identifier: "daily-new", content: { data: { category: "daily" } } },
   { identifier: "daily-legacy", content: { title: "Nexus online", data: { route: "/today" } } },
   { identifier: "pause", content: { title: "Nexus", data: { category: "focus_return" } } },
 ],
 cancelScheduledNotificationAsync: async (id: string) => { api.cancelled.push(id); },
 getPermissionsAsync: async () => ({ status: "granted" }),
 setNotificationChannelAsync: async () => undefined,
 scheduleNotificationAsync: async (value: { content: { title: string; body: string; data: { category: string } } }) => { api.scheduled.push(value); },
 AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DAILY: "daily" },
}));
import { configureDailyReminder } from "@/services/notification.service";
describe("notification ownership", () => {
 it("replaces only its daily category and preserves pause or deadline reminders", async () => {
   expect((await configureDailyReminder(true, "18:00")).enabled).toBe(true);
   expect(api.cancelled).toEqual(["daily-new", "daily-legacy"]);
   expect(api.scheduled[0]!.content.data.category).toBe("daily");
   expect(api.scheduled[0]!.content.body).not.toMatch(/missão pronta|missão gerada/i);
 });
});
