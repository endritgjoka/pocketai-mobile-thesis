import { create } from "zustand";
import { settingsRepository } from "../repositories/settingsRepository";
import { AppSettings } from "../types";

type SettingsState = AppSettings & {
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
};

const initial: AppSettings = {
  hasCompletedOnboarding: false,
  activeModelId: null,
  contextSize: 2048,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 512,
  ragChunkSize: 512,
  ragTopK: 4,
  contextPrioritizationEnabled: false,
  prioritizationStrategy: "pocketai",
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  hydrate: async () => {
    const settings = await settingsRepository.getSettings();
    set(settings);
  },
  updateSettings: async (patch) => {
    const next = await settingsRepository.patchSettings(patch);
    set(next);
  }
}));
