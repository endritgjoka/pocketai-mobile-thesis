import { CalendarEvent, CalendarPreferences } from "../types/calendar";
import { PermissionStatus } from "../types/permissions";
import { execute, queryAll, queryFirst } from "../db/database";
import { nowIso } from "../utils/dates";

const mapEvent = (row: any): CalendarEvent => ({
  id: row.id,
  externalId: row.external_id,
  title: row.title,
  startDate: row.start_date,
  endDate: row.end_date,
  location: row.location,
  calendarTitle: row.calendar_title,
  notes: row.notes,
  allDay: Boolean(row.all_day),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const defaultPreferences = (): CalendarPreferences => ({
  id: "default",
  permissionStatus: "unknown",
  calendarIntegrationEnabled: false,
  meetingRemindersEnabled: false,
  reminderMinutesBefore: 30,
  updatedAt: nowIso()
});

const mapPreferences = (row: any): CalendarPreferences => ({
  id: row.id,
  permissionStatus: row.permission_status as PermissionStatus,
  calendarIntegrationEnabled: Boolean(row.calendar_integration_enabled),
  meetingRemindersEnabled: Boolean(row.meeting_reminders_enabled),
  reminderMinutesBefore: row.reminder_minutes_before ?? 30,
  updatedAt: row.updated_at
});

export const calendarRepository = {
  async replaceEvents(events: CalendarEvent[]) {
    await execute("DELETE FROM calendar_events");
    for (const event of events) {
      await execute(
        `INSERT OR REPLACE INTO calendar_events (id, external_id, title, start_date, end_date, location, calendar_title, notes, all_day, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [event.id, event.externalId, event.title, event.startDate, event.endDate, event.location, event.calendarTitle, event.notes, event.allDay ? 1 : 0, event.createdAt, event.updatedAt]
      );
    }
  },

  async getTodayEvents() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const rows = await queryAll<any>(
      "SELECT * FROM calendar_events WHERE start_date >= ? AND start_date < ? ORDER BY start_date ASC",
      [start.toISOString(), end.toISOString()]
    );
    return rows.map(mapEvent);
  },

  async getPreferences(): Promise<CalendarPreferences> {
    const row = await queryFirst<any>("SELECT * FROM calendar_preferences WHERE id = ?", ["default"]);
    return row ? mapPreferences(row) : defaultPreferences();
  },

  async savePreferences(preferences: CalendarPreferences) {
    await execute(
      `INSERT OR REPLACE INTO calendar_preferences (id, permission_status, calendar_integration_enabled, meeting_reminders_enabled, reminder_minutes_before, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        preferences.id,
        preferences.permissionStatus,
        preferences.calendarIntegrationEnabled ? 1 : 0,
        preferences.meetingRemindersEnabled ? 1 : 0,
        preferences.reminderMinutesBefore,
        preferences.updatedAt
      ]
    );
  },

  async patchPreferences(patch: Partial<CalendarPreferences>) {
    const next = { ...(await this.getPreferences()), ...patch, updatedAt: nowIso() };
    await this.savePreferences(next);
    return next;
  }
};
