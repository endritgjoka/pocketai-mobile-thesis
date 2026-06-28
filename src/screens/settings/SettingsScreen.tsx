import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppButton } from "../../components/ui/AppButton";
import { ModelManagementCard } from "../../components/model/ModelManagementCard";
import { PermissionStatusRow } from "../../components/permissions/PermissionStatusRow";
import { MODEL_CATALOG } from "../../config/models";
import { colors, radii, spacing, typography } from "../../config/theme";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { chatRepository } from "../../repositories/chatRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { ModelDownloadProgress, ModelDownloadService } from "../../services/models/ModelDownloadService";
import { NotificationService } from "../../services/notifications/NotificationService";
import { useCalendarStore } from "../../store/useCalendarStore";
import { useModelStore } from "../../store/useModelStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { confirmDestructive } from "../../components/ui/ConfirmDialog";
import { ModelId } from "../../types";
import { PermissionStatus } from "../../types/permissions";
import { openAppSettings } from "../../utils/openAppSettings";
import { toUserMessage } from "../../utils/errors";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const models = useModelStore((state) => state.models);
  const loadModels = useModelStore((state) => state.loadModels);
  const calendarStatus = useCalendarStore((state) => state.permissionStatus);
  const calendarPreferences = useCalendarStore((state) => state.preferences);
  const checkCalendarPermission = useCalendarStore((state) => state.checkPermission);
  const requestCalendarPermissions = useCalendarStore((state) => state.requestPermissions);
  const refreshCalendarEvents = useCalendarStore((state) => state.refreshEvents);
  const updateCalendarPreferences = useCalendarStore((state) => state.updatePreferences);
  const syncMeetingReminders = useCalendarStore((state) => state.syncMeetingReminders);
  const [progressByModel, setProgressByModel] = useState<Record<string, ModelDownloadProgress>>({});
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>(settings.notificationPermissionStatus ?? "unknown");

  const refreshNotificationStatus = useCallback(async () => {
    setNotificationStatus("checking");
    const nextStatus = await NotificationService.getPermissionStatus();
    setNotificationStatus(nextStatus);
    await updateSettings({ notificationPermissionStatus: nextStatus, notificationsEnabled: nextStatus === "granted" ? settings.notificationsEnabled : false });
    return nextStatus;
  }, [settings.notificationsEnabled, updateSettings]);

  const refreshSettingsPermissions = useCallback(() => {
    void loadModels();
    void refreshNotificationStatus();
    void checkCalendarPermission();
  }, [checkCalendarPermission, loadModels, refreshNotificationStatus]);

  useFocusEffect(useCallback(() => {
    refreshSettingsPermissions();
  }, [refreshSettingsPermissions]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshSettingsPermissions();
    });
    return () => subscription.remove();
  }, [refreshSettingsPermissions]);

  const activeModel = useMemo(() => MODEL_CATALOG.find((item) => item.id === settings.activeModelId), [settings.activeModelId]);
  const notificationsGranted = notificationStatus === "granted";
  const calendarGranted = calendarStatus === "granted";
  const calendarIntegrationEnabled = calendarPreferences?.calendarIntegrationEnabled ?? false;
  const meetingRemindersEnabled = calendarPreferences?.meetingRemindersEnabled ?? settings.calendarMeetingRemindersEnabled;
  const reminderMinutesBefore = calendarPreferences?.reminderMinutesBefore ?? settings.calendarReminderMinutesBefore;

  const syncNotificationPatch = useCallback(async (patch: Partial<typeof settings>) => {
    const status = await NotificationService.getPermissionStatus();
    setNotificationStatus(status);
    await updateSettings({ notificationPermissionStatus: status });
    if (status !== "granted") {
      Alert.alert("Notifications unavailable", "Enable notification permission in system settings to schedule local reminders.");
      return;
    }
    const next = { ...settings, ...patch, notificationPermissionStatus: status, notificationsEnabled: true };
    try {
      await NotificationService.syncNotificationSchedules(next);
      await updateSettings({ ...patch, notificationsEnabled: true, notificationPermissionStatus: status });
    } catch (error) {
      Alert.alert("Notification setup failed", toUserMessage(error));
      await refreshNotificationStatus();
    }
  }, [refreshNotificationStatus, settings, updateSettings]);

  const requestNotifications = useCallback(async () => {
    try {
      await NotificationService.requestPermission();
      const nextStatus = await NotificationService.getPermissionStatus();
      setNotificationStatus(nextStatus);
      await updateSettings({ notificationPermissionStatus: nextStatus, notificationsEnabled: nextStatus === "granted" });
      if (nextStatus === "granted") Alert.alert("Notifications enabled", "PocketAI can now schedule local reminders on this device.");
      else Alert.alert("Notifications disabled", "Enable notifications in system settings to receive local reminders.");
    } catch (error) {
      Alert.alert("Permission failed", toUserMessage(error, "Notification permission could not be requested."));
    }
  }, [updateSettings]);

  const testNotification = useCallback(async () => {
    try {
      await NotificationService.scheduleTestNotification();
      Alert.alert("Scheduled", "A PocketAI test notification should appear in about 5 seconds.");
    } catch (error) {
      Alert.alert("Notification failed", toUserMessage(error));
    }
  }, []);

  const cancelNotifications = useCallback(async () => {
    try {
      await NotificationService.cancelPocketAINotifications();
      await updateSettings({ notificationsEnabled: false, morningBriefingEnabled: false, documentReviewEnabled: false, benchmarkReminderEnabled: false, calendarMeetingRemindersEnabled: false });
      await updateCalendarPreferences({ meetingRemindersEnabled: false });
      Alert.alert("Cancelled", "PocketAI local reminders were cancelled.");
    } catch (error) {
      Alert.alert("Cancel failed", toUserMessage(error, "PocketAI reminders could not be cancelled."));
    }
  }, [updateCalendarPreferences, updateSettings]);

  const requestCalendar = useCallback(async () => {
    const status = await requestCalendarPermissions();
    if (status === "granted") Alert.alert("Calendar connected", "PocketAI can now read local calendar events.");
    else Alert.alert("Calendar disabled", "Enable calendar permission in system settings to use local meeting reminders.");
  }, [requestCalendarPermissions]);

  const updateCalendarPatch = useCallback(async (patch: { integration?: boolean; reminders?: boolean; minutes?: 10 | 15 | 30 | 60 }) => {
    if (!calendarGranted) {
      Alert.alert("Calendar permission needed", "Enable calendar permission before using meeting reminders.");
      return;
    }
    const notificationPermissionStatus = await NotificationService.getPermissionStatus();
    setNotificationStatus(notificationPermissionStatus);
    await updateSettings({ notificationPermissionStatus });
    if (patch.reminders && notificationPermissionStatus !== "granted") {
      Alert.alert("Notification permission needed", "Enable notification permission to receive meeting reminders.");
      return;
    }
    await updateCalendarPreferences({
      calendarIntegrationEnabled: patch.integration ?? calendarIntegrationEnabled,
      meetingRemindersEnabled: patch.reminders ?? meetingRemindersEnabled,
      reminderMinutesBefore: patch.minutes ?? reminderMinutesBefore
    });
    await updateSettings({
      calendarMeetingRemindersEnabled: patch.reminders ?? meetingRemindersEnabled,
      calendarReminderMinutesBefore: (patch.minutes ?? reminderMinutesBefore) as 10 | 15 | 30 | 60
    });
    if (patch.reminders === false) await NotificationService.cancelCalendarEventReminders();
  }, [calendarGranted, calendarIntegrationEnabled, meetingRemindersEnabled, reminderMinutesBefore, updateCalendarPreferences, updateSettings]);

  const scheduleMeetingReminders = useCallback(async () => {
    try {
      if (!calendarGranted) throw new Error("Enable calendar permission to schedule meeting reminders.");
      if ((await NotificationService.getPermissionStatus()) !== "granted") throw new Error("Enable notification permission to receive meeting reminders.");
      await refreshCalendarEvents();
      await updateCalendarPatch({ integration: true, reminders: true });
      await syncMeetingReminders();
      Alert.alert("Meeting reminders scheduled", "PocketAI scheduled local reminders for upcoming calendar events.");
    } catch (error) {
      Alert.alert("Calendar reminder failed", toUserMessage(error));
    }
  }, [calendarGranted, refreshCalendarEvents, syncMeetingReminders, updateCalendarPatch]);

  const download = useCallback(async (modelId: ModelId) => {
    try {
      await ModelDownloadService.downloadModel(modelId, (progress) => setProgressByModel((state) => ({ ...state, [modelId]: progress })));
      await loadModels();
      await useSettingsStore.getState().hydrate();
    } catch (error) {
      setProgressByModel((state) => ({ ...state, [modelId]: { status: "failed", progress: 0, downloadedBytes: 0, totalBytes: null, error: error instanceof Error ? error.message : "Download failed" } }));
      Alert.alert("Download failed", error instanceof Error ? error.message : "The model could not be downloaded.");
    }
  }, [loadModels]);

  const deleteModel = useCallback((modelId: ModelId) => confirmDestructive("Delete model", "The GGUF file will be removed from this device.", async () => { await ModelDownloadService.deleteModel(modelId); await loadModels(); await useSettingsStore.getState().hydrate(); }), [loadModels]);

  const clearAll = () => confirmDestructive("Clear all app data", "This removes chats, documents, and benchmark runs.", async () => {
    await chatRepository.clear();
    await documentRepository.clear();
    await benchmarkRepository.clear();
    Alert.alert("Cleared", "Local app data was removed.");
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Models, inference, retrieval, reminders, and local data</Text></View>
        <Section title="AI Models">
          <SettingRow icon="hardware-chip-outline" label="Active model" value={activeModel?.name ?? "None"} />
          <View style={styles.modelList}>{MODEL_CATALOG.map((model) => <ModelManagementCard key={model.id} model={model} local={models.find((item) => item.id === model.id)} active={settings.activeModelId === model.id} progress={progressByModel[model.id]} onDownload={() => download(model.id)} onCancel={() => ModelDownloadService.cancel(model.id)} onSetActive={() => updateSettings({ activeModelId: model.id })} onDelete={() => deleteModel(model.id)} onInfo={() => navigation.navigate("ModelInfo", { modelId: model.id })} />)}</View>
        </Section>
        <Section title="Inference">
          <PickerRow label="Context size" value={String(settings.contextSize)} options={[1024, 2048, 4096]} onPick={(value) => updateSettings({ contextSize: value as 1024 | 2048 | 4096 })} />
          <PickerRow label="Temperature" value={String(settings.temperature)} options={[0.2, 0.7, 1]} onPick={(value) => updateSettings({ temperature: value })} />
          <PickerRow label="Top P" value={String(settings.topP)} options={[0.8, 0.9, 0.95]} onPick={(value) => updateSettings({ topP: value })} />
          <PickerRow label="Max tokens" value={String(settings.maxTokens)} options={[128, 256, 512]} onPick={(value) => updateSettings({ maxTokens: value })} />
          <View style={styles.toggleRow}><View style={styles.toggleText}><Text style={styles.rowLabel}>Use mock inference</Text><Text style={styles.rowHint}>UI testing only. Disabled by default.</Text></View><Switch value={settings.useMockInference} onValueChange={(value) => updateSettings({ useMockInference: value })} /></View>
        </Section>
        <Section title="Retrieval"><PickerRow label="Chunk size" value={String(settings.ragChunkSize)} options={[256, 512, 1024]} onPick={(value) => updateSettings({ ragChunkSize: value as 256 | 512 | 1024 })} /><PickerRow label="Top K" value={String(settings.ragTopK)} options={[2, 4, 6, 8]} onPick={(value) => updateSettings({ ragTopK: value as 2 | 4 | 6 | 8 })} /></Section>
        <Section title="Notifications">
          <PermissionStatusRow
            status={notificationStatus}
            connectedLabel="Granted"
            helperText={notificationStatus === "checking" || notificationStatus === "unknown" ? "Checking notification permission..." : "Local reminders only. No push service is used."}
            requestLabel="Request Notification Permission"
            onRequest={requestNotifications}
            onOpenSettings={() => { void openAppSettings(); }}
          />
          {notificationsGranted ? <View style={styles.notificationActions}><AppButton title="Test Notification" icon="time-outline" variant="secondary" onPress={testNotification} style={styles.notificationButton} /></View> : null}
          <NotificationToggle disabled={!notificationsGranted} label="Morning Briefing" time={settings.morningBriefingTime} value={settings.morningBriefingEnabled} onValueChange={(value) => { void syncNotificationPatch({ morningBriefingEnabled: value }); }} />
          <NotificationToggle disabled={!notificationsGranted} label="Document Review" time={settings.documentReviewTime} value={settings.documentReviewEnabled} onValueChange={(value) => { void syncNotificationPatch({ documentReviewEnabled: value }); }} />
          <NotificationToggle disabled={!notificationsGranted} label="Benchmark Reminder" time={settings.benchmarkReminderTime} value={settings.benchmarkReminderEnabled} onValueChange={(value) => { void syncNotificationPatch({ benchmarkReminderEnabled: value }); }} />
          <DangerRow label="Cancel all PocketAI notifications" onPress={cancelNotifications} />
        </Section>
        <Section title="Calendar">
          <PermissionStatusRow
            status={calendarStatus}
            connectedLabel="Granted"
            helperText={calendarStatus === "checking" || calendarStatus === "unknown" ? "Checking calendar permission..." : "Calendar data stays local on this phone."}
            requestLabel="Request Calendar Permission"
            onRequest={requestCalendar}
            onOpenSettings={() => { void openAppSettings(); }}
          />
          {calendarGranted ? <><NotificationToggle label="Enable Calendar Integration" time="Local events" value={calendarIntegrationEnabled} onValueChange={(value) => { void updateCalendarPatch({ integration: value, reminders: value ? meetingRemindersEnabled : false }); }} /><NotificationToggle disabled={!calendarIntegrationEnabled || !notificationsGranted} label="Meeting Reminders" time={`${reminderMinutesBefore} minutes before events`} value={meetingRemindersEnabled} onValueChange={(value) => { void updateCalendarPatch({ reminders: value }); }} /><PickerRow label="Reminder time" value={String(reminderMinutesBefore)} options={[10, 15, 30, 60]} onPick={(value) => { void updateCalendarPatch({ minutes: value as 10 | 15 | 30 | 60 }); }} /><View style={styles.notificationActions}><AppButton title="Refresh Events" icon="refresh-outline" variant="secondary" onPress={() => { void refreshCalendarEvents(); }} style={styles.notificationButton} /><AppButton title="Schedule Reminders" icon="alarm-outline" onPress={scheduleMeetingReminders} style={styles.notificationButton} /></View>{!notificationsGranted ? <Text style={styles.inlineHelp}>Enable notification permission to receive meeting reminders.</Text> : null}</> : null}
        </Section>
        <Section title="Data"><DangerRow label="Clear chats" onPress={() => confirmDestructive("Clear chats", "All conversations will be deleted.", () => chatRepository.clear())} /><DangerRow label="Clear documents" onPress={() => confirmDestructive("Clear documents", "All imported documents and chunks will be deleted.", () => documentRepository.clear())} /><DangerRow label="Clear benchmarks" onPress={() => confirmDestructive("Clear benchmarks", "All benchmark runs will be deleted.", () => benchmarkRepository.clear())} /><DangerRow label="Clear all app data" onPress={clearAll} strong /></Section>
        <Section title="About"><SettingRow icon="school-outline" label="PocketAI" value="Master thesis prototype" /><Text style={styles.about}>Empirical evaluation of quantization and information retrieval algorithms for deploying large language models on mobile devices.</Text><Text style={styles.about}>Author: Endrit Gjokaj</Text></Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) { return <View style={styles.sectionWrap}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.section}>{children}</View></View>; }
function SettingRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.settingRow}><Ionicons name={icon} size={20} color={colors.textSecondary} /><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue} numberOfLines={1}>{value}</Text></View>; }
function PickerRow({ label, value, options, onPick }: { label: string; value: string; options: number[]; onPick: (value: number) => void }) { return <View style={styles.pickerRow}><View style={styles.pickerHeader}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View><View style={styles.segmented}>{options.map((option) => <Pressable key={option} onPress={() => onPick(option)} style={[styles.segment, String(option) === value && styles.segmentActive]}><Text style={[styles.segmentText, String(option) === value && styles.segmentTextActive]}>{option}</Text></Pressable>)}</View></View>; }
function NotificationToggle({ label, time, value, onValueChange, disabled }: { label: string; time: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) { return <View style={[styles.toggleRow, disabled && styles.disabled]}><View style={styles.toggleText}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowHint}>{time.includes(":") ? `Daily at ${time}` : time}</Text></View><Switch disabled={disabled} value={value} onValueChange={onValueChange} /></View>; }
function DangerRow({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}><Ionicons name={strong ? "trash" : "trash-outline"} size={19} color={colors.danger} /><Text style={styles.dangerText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { marginBottom: spacing.xs },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  sectionWrap: { gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginLeft: spacing.xs },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, overflow: "hidden" },
  modelList: { padding: spacing.md, gap: spacing.md },
  settingRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  rowHint: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  rowValue: { ...typography.secondary, color: colors.textSecondary, flex: 1, textAlign: "right" },
  pickerRow: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: spacing.md },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 34, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  segmentActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentText: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
  segmentTextActive: { color: colors.primary },
  toggleRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  toggleText: { flex: 1, paddingRight: spacing.md },
  disabled: { opacity: 0.45 },
  notificationStatus: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  notificationActions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  notificationButton: { flex: 1 },
  inlineHelp: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, lineHeight: 18 },
  dangerRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dangerText: { ...typography.body, color: colors.danger, fontWeight: "600" },
  pressed: { backgroundColor: colors.surfaceMuted },
  about: { ...typography.secondary, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }
});
