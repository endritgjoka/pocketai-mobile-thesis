import { PermissionStatus } from "./permissions";

export interface CalendarEvent {
  id: string;
  externalId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  calendarTitle: string | null;
  notes: string | null;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarPreferences {
  id: string;
  permissionStatus: PermissionStatus;
  calendarIntegrationEnabled: boolean;
  meetingRemindersEnabled: boolean;
  reminderMinutesBefore: number;
  updatedAt: string;
}
