import { AppSettings, ModelId } from "../types";
import { execute, queryFirst } from "../db/database";

const defaults: AppSettings = {
  hasCompletedOnboarding: false,
  activeModelId: null,
  contextSize: 2048,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 512,
  ragChunkSize: 512,
  ragTopK: 4,
  useMockInference: false,
  notificationsEnabled: false,
  morningBriefingEnabled: false,
  documentReviewEnabled: false,
  benchmarkReminderEnabled: false,
  notificationPermissionStatus: "unknown",
  calendarMeetingRemindersEnabled: false,
  calendarReminderMinutesBefore: 30,
  morningBriefingTime: "07:30",
  documentReviewTime: "18:00",
  benchmarkReminderTime: "20:00"
};

export const settingsRepository = {
  async getSettings(): Promise<AppSettings> {
    const row = await queryFirst<{ value: string }>("SELECT value FROM settings WHERE key = ?", ["app_settings"]);
    if (!row) return defaults;
    return { ...defaults, ...JSON.parse(row.value) };
  },

  async saveSettings(settings: AppSettings) {
    await execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["app_settings", JSON.stringify(settings)]);
  },

  async patchSettings(patch: Partial<AppSettings>) {
    const settings = await this.getSettings();
    const next = { ...settings, ...patch };
    await this.saveSettings(next);
    return next;
  },

  async setActiveModel(activeModelId: ModelId) {
    return this.patchSettings({ activeModelId });
  }
};
