import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AppSettings } from "../../types";
import { CalendarEvent, CalendarPreferences } from "../../types/calendar";
import { PermissionStatus } from "../../types/permissions";

type ReminderKind = "morning" | "document" | "benchmark";

type NotificationPreferences = Pick<
  AppSettings,
  | "notificationsEnabled"
  | "morningBriefingEnabled"
  | "documentReviewEnabled"
  | "benchmarkReminderEnabled"
  | "morningBriefingTime"
  | "documentReviewTime"
  | "benchmarkReminderTime"
>;

const CHANNEL_ID = "pocketai-local-reminders";
const CALENDAR_PREFIX = "pocketai:calendar:";
const IDS: Record<ReminderKind | "test", string> = {
  test: "pocketai:test-notification",
  morning: "pocketai:morning-briefing",
  document: "pocketai:document-review",
  benchmark: "pocketai:benchmark-reminder"
};

const REMINDERS: Record<ReminderKind, { title: string; body: string }> = {
  morning: { title: "PocketAI Morning Briefing", body: "Open PocketAI to review your local insights and plans." },
  document: { title: "Review your document", body: "Continue your offline document analysis in PocketAI." },
  benchmark: { title: "Run a PocketAI benchmark", body: "Collect another local inference result for your thesis." }
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
});

const normalizeStatus = (status: Notifications.NotificationPermissionsStatus): PermissionStatus => {
  if (status.granted) return "granted";
  if (status.status === Notifications.PermissionStatus.DENIED) return "denied";
  if (status.status === Notifications.PermissionStatus.UNDETERMINED) return "not_determined";
  return "unknown";
};

const ensureChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: "PocketAI reminders", importance: Notifications.AndroidImportance.DEFAULT });
};

const parseTime = (value: string) => {
  const [hourText, minuteText] = value.split(":");
  return { hour: Number(hourText) || 0, minute: Number(minuteText) || 0 };
};

const dailyTrigger = (time: string) => {
  const { hour, minute } = parseTime(time);
  if (Platform.OS === "ios") return { type: "calendar", repeats: true, value: { hour, minute } } as Notifications.NotificationTriggerInput;
  return { type: "daily", hour, minute, channelId: CHANNEL_ID } as Notifications.NotificationTriggerInput;
};

const scheduleReminder = async (kind: ReminderKind, time: string) => {
  await ensureChannel();
  await Notifications.cancelScheduledNotificationAsync(IDS[kind]).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({ identifier: IDS[kind], content: { ...REMINDERS[kind], data: { source: "pocketai", kind } }, trigger: dailyTrigger(time) });
};

const calendarNotificationId = (event: CalendarEvent) => `${CALENDAR_PREFIX}${event.externalId}:${new Date(event.startDate).getTime()}`;

export const NotificationService = {
  async getPermissionStatus(): Promise<PermissionStatus> {
    try { return normalizeStatus(await Notifications.getPermissionsAsync()); } catch { return "unknown"; }
  },

  async requestPermission(): Promise<PermissionStatus> {
    await Notifications.requestPermissionsAsync();
    const status = await this.getPermissionStatus();
    if (status === "granted") await ensureChannel();
    return status;
  },

  async scheduleTestNotification() {
    const status = await this.getPermissionStatus();
    if (status !== "granted") throw new Error("Notifications are disabled. Enable them in system settings to receive local reminders.");
    await ensureChannel();
    await Notifications.cancelScheduledNotificationAsync(IDS.test).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: IDS.test,
      content: { title: "PocketAI test notification", body: "Local notifications are working on this device.", data: { source: "pocketai", kind: "test" } },
      trigger: { type: "timeInterval", seconds: 5, repeats: false, channelId: Platform.OS === "android" ? CHANNEL_ID : undefined } as Notifications.NotificationTriggerInput
    });
  },

  scheduleMorningBriefing: () => scheduleReminder("morning", "07:30"),
  scheduleDocumentReview: () => scheduleReminder("document", "18:00"),
  scheduleBenchmarkReminder: () => scheduleReminder("benchmark", "20:00"),

  async cancelCalendarEventReminders() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    await Promise.all(scheduled
      .filter((notification) => notification.identifier.startsWith(CALENDAR_PREFIX))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined)));
  },

  async cancelPocketAINotifications() {
    await Promise.all(Object.values(IDS).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
    await this.cancelCalendarEventReminders();
  },

  async scheduleCalendarEventReminder(event: CalendarEvent, minutesBefore: number) {
    if (event.allDay) return;
    const triggerDate = new Date(new Date(event.startDate).getTime() - minutesBefore * 60_000);
    if (triggerDate.getTime() <= Date.now()) return;
    await ensureChannel();
    const locationText = event.location ? ` at ${event.location}` : "";
    await Notifications.scheduleNotificationAsync({
      identifier: calendarNotificationId(event),
      content: {
        title: "Upcoming event",
        body: `${event.title} starts in ${minutesBefore} minutes${locationText}.`,
        data: { source: "pocketai", kind: "calendar", eventId: event.externalId }
      },
      trigger: Platform.OS === "ios" ? ({ type: "date", date: triggerDate } as Notifications.NotificationTriggerInput) : ({ type: "date", date: triggerDate, channelId: CHANNEL_ID } as Notifications.NotificationTriggerInput)
    });
  },

  async scheduleCalendarEventReminders(events: CalendarEvent[], minutesBefore: number) {
    await this.cancelCalendarEventReminders();
    await Promise.all(events.map((event) => this.scheduleCalendarEventReminder(event, minutesBefore)));
  },

  async syncCalendarReminderNotifications(events: CalendarEvent[], preferences: Pick<CalendarPreferences, "meetingRemindersEnabled" | "reminderMinutesBefore">) {
    if (!preferences.meetingRemindersEnabled) {
      await this.cancelCalendarEventReminders();
      return;
    }
    const status = await this.getPermissionStatus();
    if (status !== "granted") throw new Error("Enable notification permission to receive meeting reminders.");
    await this.scheduleCalendarEventReminders(events, preferences.reminderMinutesBefore);
  },

  async syncNotificationSchedules(preferences: NotificationPreferences) {
    if (!preferences.notificationsEnabled) {
      await Promise.all(Object.values(IDS).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
      return;
    }
    const status = await this.getPermissionStatus();
    if (status !== "granted") throw new Error("Notifications are disabled. Enable them in system settings to receive local reminders.");
    await Promise.all([
      preferences.morningBriefingEnabled ? scheduleReminder("morning", preferences.morningBriefingTime) : Notifications.cancelScheduledNotificationAsync(IDS.morning).catch(() => undefined),
      preferences.documentReviewEnabled ? scheduleReminder("document", preferences.documentReviewTime) : Notifications.cancelScheduledNotificationAsync(IDS.document).catch(() => undefined),
      preferences.benchmarkReminderEnabled ? scheduleReminder("benchmark", preferences.benchmarkReminderTime) : Notifications.cancelScheduledNotificationAsync(IDS.benchmark).catch(() => undefined)
    ]);
  }
};
