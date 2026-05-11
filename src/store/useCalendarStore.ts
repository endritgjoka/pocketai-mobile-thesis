import { create } from "zustand";
import { CalendarEvent, CalendarPreferences } from "../types/calendar";
import { PermissionStatus } from "../types/permissions";
import { CalendarService } from "../services/calendar/CalendarService";
import { calendarRepository } from "../repositories/calendarRepository";
import { NotificationService } from "../services/notifications/NotificationService";
import { toUserMessage } from "../utils/errors";

type CalendarState = {
  permissionStatus: PermissionStatus;
  preferences: CalendarPreferences | null;
  todayEvents: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  checkPermission: () => Promise<PermissionStatus>;
  requestPermissions: () => Promise<PermissionStatus>;
  loadCached: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  updatePreferences: (patch: Partial<CalendarPreferences>) => Promise<void>;
  syncMeetingReminders: () => Promise<void>;
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  permissionStatus: "unknown",
  preferences: null,
  todayEvents: [],
  isLoading: false,
  error: null,

  checkPermission: async () => {
    set({ isLoading: true, error: null, permissionStatus: "checking" });
    try {
      const status = await CalendarService.getPermissionStatus();
      const preferences = await calendarRepository.patchPreferences({ permissionStatus: status });
      set({ permissionStatus: status, preferences, isLoading: false });
      return status;
    } catch (error) {
      const message = toUserMessage(error, "Calendar permission could not be checked.");
      set({ permissionStatus: "unsupported", isLoading: false, error: message });
      return "unsupported";
    }
  },

  requestPermissions: async () => {
    set({ isLoading: true, error: null, permissionStatus: "checking" });
    try {
      await CalendarService.requestPermissions();
      const status = await CalendarService.getPermissionStatus();
      const preferences = await calendarRepository.patchPreferences({
        permissionStatus: status,
        calendarIntegrationEnabled: status === "granted" ? true : get().preferences?.calendarIntegrationEnabled ?? false
      });
      set({ permissionStatus: status, preferences, isLoading: false });
      if (status === "granted") await get().refreshEvents();
      return status;
    } catch (error) {
      const message = toUserMessage(error, "Calendar permission could not be requested.");
      set({ permissionStatus: "denied", isLoading: false, error: message });
      return "denied";
    }
  },

  loadCached: async () => {
    const [preferences, todayEvents] = await Promise.all([calendarRepository.getPreferences(), calendarRepository.getTodayEvents()]);
    set({ preferences, todayEvents, permissionStatus: preferences.permissionStatus });
  },

  refreshEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await CalendarService.getPermissionStatus();
      const preferences = await calendarRepository.patchPreferences({ permissionStatus: status });
      if (status !== "granted") {
        set({ permissionStatus: status, preferences, isLoading: false });
        return;
      }
      const todayEvents = await CalendarService.fetchTodayEvents();
      await calendarRepository.replaceEvents(todayEvents);
      set({ permissionStatus: status, preferences, todayEvents, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toUserMessage(error, "Calendar events could not be refreshed.") });
    }
  },

  updatePreferences: async (patch) => {
    const preferences = await calendarRepository.patchPreferences(patch);
    set({ preferences, permissionStatus: preferences.permissionStatus });
    if (!preferences.meetingRemindersEnabled) await NotificationService.cancelCalendarEventReminders();
  },

  syncMeetingReminders: async () => {
    const preferences = get().preferences ?? await calendarRepository.getPreferences();
    if (!preferences.meetingRemindersEnabled || get().permissionStatus !== "granted") {
      await NotificationService.cancelCalendarEventReminders();
      return;
    }
    const events = await CalendarService.fetchUpcomingEvents(7);
    await NotificationService.syncCalendarReminderNotifications(events, preferences);
  }
}));
