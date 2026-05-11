import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import { CalendarEvent } from "../../types/calendar";
import { PermissionStatus } from "../../types/permissions";
import { createId } from "../../utils/errors";
import { nowIso } from "../../utils/dates";

const normalizeStatus = (response: Calendar.PermissionResponse): PermissionStatus => {
  if (response.granted || response.status === Calendar.PermissionStatus.GRANTED) return "granted";
  if (response.status === Calendar.PermissionStatus.DENIED) return response.canAskAgain ? "denied" : "denied";
  if (response.status === Calendar.PermissionStatus.UNDETERMINED) return "not_determined";
  return "unknown";
};

const toAppEvent = (event: Calendar.Event, calendarTitle: string | null): CalendarEvent => {
  const timestamp = nowIso();
  const externalId = event.id ?? createId("calendar_external");
  return {
    id: `calendar_${externalId}_${new Date(event.startDate).getTime()}`,
    externalId,
    title: event.title?.trim() || "Untitled event",
    startDate: new Date(event.startDate).toISOString(),
    endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
    location: event.location?.trim() || null,
    calendarTitle,
    notes: event.notes?.trim() || null,
    allDay: Boolean(event.allDay),
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const CalendarService = {
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return "unsupported";
    try {
      return normalizeStatus(await Calendar.getCalendarPermissionsAsync());
    } catch {
      return "unsupported";
    }
  },

  async requestPermissions(): Promise<PermissionStatus> {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return "unsupported";
    try {
      await Calendar.requestCalendarPermissionsAsync();
      return this.getPermissionStatus();
    } catch {
      return "unsupported";
    }
  },

  async getCalendars() {
    const status = await this.getPermissionStatus();
    if (status !== "granted") return [];
    return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  },

  async fetchEventsForRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const calendars = await this.getCalendars();
    if (!calendars.length) return [];
    const events = await Calendar.getEventsAsync(calendars.map((calendar) => calendar.id), startDate, endDate);
    const titleById = new Map(calendars.map((calendar) => [calendar.id, calendar.title ?? null]));
    return events
      .map((event) => toAppEvent(event, titleById.get(event.calendarId) ?? null))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  },

  async fetchTodayEvents(): Promise<CalendarEvent[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.fetchEventsForRange(start, end);
  },

  async fetchUpcomingEvents(daysAhead = 7): Promise<CalendarEvent[]> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);
    return this.fetchEventsForRange(start, end);
  }
};
