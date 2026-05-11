import React, { useCallback, useEffect } from "react";
import { Alert, AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { colors, spacing, typography } from "../../config/theme";
import { useHealthStore } from "../../store/useHealthStore";
import { useCalendarStore } from "../../store/useCalendarStore";
import { PermissionStatus } from "../../types/permissions";
import { openAppSettings } from "../../utils/openAppSettings";

const formatMetric = (value: number | null | undefined, suffix = "") => value == null ? "No data" : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
const statusTone = (status: PermissionStatus | "available" | "checking") => status === "granted" || status === "available" ? "success" : status === "unsupported" || status === "denied" || status === "restricted" ? "danger" : "warning";
const statusLabel = (status: PermissionStatus, grantedLabel = "Connected") => status === "unknown" || status === "checking" ? "Checking" : status === "granted" ? grantedLabel : status === "denied" ? "Permission denied" : status === "restricted" ? "Restricted" : status === "unsupported" ? "Unsupported" : "Not connected";
const formatEventTime = (value: string) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function InsightsScreen() {
  const availability = useHealthStore((state) => state.availability);
  const healthStatus = useHealthStore((state) => state.permissionStatus);
  const latestSnapshot = useHealthStore((state) => state.latestSnapshot);
  const healthLoading = useHealthStore((state) => state.isLoading);
  const healthError = useHealthStore((state) => state.error);
  const checkHealthAvailability = useHealthStore((state) => state.checkAvailability);
  const requestHealthPermissions = useHealthStore((state) => state.requestPermissions);
  const refreshSnapshot = useHealthStore((state) => state.refreshSnapshot);
  const loadLatestSnapshot = useHealthStore((state) => state.loadLatestSnapshot);

  const calendarStatus = useCalendarStore((state) => state.permissionStatus);
  const todayEvents = useCalendarStore((state) => state.todayEvents);
  const calendarLoading = useCalendarStore((state) => state.isLoading);
  const calendarError = useCalendarStore((state) => state.error);
  const checkCalendarPermission = useCalendarStore((state) => state.checkPermission);
  const requestCalendarPermissions = useCalendarStore((state) => state.requestPermissions);
  const refreshEvents = useCalendarStore((state) => state.refreshEvents);
  const loadCalendarCached = useCalendarStore((state) => state.loadCached);

  const refreshPermissions = useCallback(async () => {
    await Promise.all([loadLatestSnapshot(), loadCalendarCached()]);
    const [health, calendar] = await Promise.all([checkHealthAvailability(), checkCalendarPermission()]);
    if (health === "granted") void refreshSnapshot();
    if (calendar === "granted") void refreshEvents();
  }, [checkCalendarPermission, checkHealthAvailability, loadCalendarCached, loadLatestSnapshot, refreshEvents, refreshSnapshot]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refreshPermissions().finally(() => { if (!active) return; });
    return () => { active = false; };
  }, [refreshPermissions]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermissions();
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  const handleRequestHealth = useCallback(async () => {
    const status = await requestHealthPermissions();
    if (status === "granted") Alert.alert("Fitness connected", "PocketAI can now read selected fitness data locally.");
    else if (status === "denied") Alert.alert("Permission denied", "Enable Health permissions in system settings to use local fitness insights.");
    else if (status === "unsupported") Alert.alert("Fitness unavailable", "Fitness integration is not available on this device or installed build.");
    else Alert.alert("Fitness permission not completed", "The Health permission sheet did not complete. Try again, or enable Health access for PocketAI in system settings.");
  }, [requestHealthPermissions]);

  const handleRequestCalendar = useCallback(async () => {
    const status = await requestCalendarPermissions();
    if (status === "granted") Alert.alert("Calendar connected", "PocketAI can now read local calendar events on this device.");
    else if (status === "denied") Alert.alert("Permission denied", "Enable Calendar permissions in system settings to use local event reminders.");
    else if (status === "unsupported") Alert.alert("Calendar unavailable", "Calendar integration is not available on this device or installed build.");
  }, [requestCalendarPermissions]);

  const healthConnectionLabel = availability === "checking" ? "Checking" : availability === "unsupported" ? "Unsupported" : statusLabel(healthStatus);
  const healthToneSource = availability === "checking" ? "checking" : availability === "unsupported" ? "unsupported" : healthStatus;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Local device context for offline AI assistance.</Text>
        </View>

        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}><Ionicons name="fitness-outline" size={22} color={colors.primary} /></View>
            <View style={styles.headerText}><Text style={styles.cardTitle}>Fitness connection</Text><Text style={styles.caption}>Health data is optional and read locally.</Text></View>
            <StatusBadge label={healthConnectionLabel} tone={statusTone(healthToneSource) as any} />
          </View>
          {healthStatus === "unknown" || healthStatus === "checking" || availability === "checking" ? <Text style={styles.caption}>Checking fitness permissions...</Text> : null}
          {healthStatus === "not_determined" ? <AppButton title="Request Fitness Permission" icon="shield-checkmark-outline" onPress={() => { void handleRequestHealth(); }} loading={healthLoading} style={styles.actionButton} /> : null}
          {healthStatus === "granted" ? <AppButton title="Refresh Fitness Data" icon="refresh-outline" variant="secondary" onPress={() => { void refreshSnapshot(); }} loading={healthLoading} style={styles.actionButton} /> : null}
          {healthStatus === "denied" || healthStatus === "restricted" ? <><Text style={styles.error}>Fitness permission was denied. Enable it in system settings to use local health insights.</Text><AppButton title="Open Settings" icon="settings-outline" variant="secondary" onPress={() => { void openAppSettings(); }} style={styles.actionButton} /></> : null}
          {healthStatus === "unsupported" || availability === "unsupported" ? <Text style={styles.error}>Fitness integration is not available on this device or simulator.</Text> : null}
          {healthError ? <Text style={styles.error}>{healthError}</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Today's Activity</Text>
          <View style={styles.metricsGrid}>
            <Metric label="Steps today" value={formatMetric(latestSnapshot?.stepsToday)} />
            <Metric label="Steps yesterday" value={formatMetric(latestSnapshot?.stepsYesterday)} />
            <Metric label="Sleep last night" value={formatMetric(latestSnapshot?.sleepHoursLastNight, "h")} />
            <Metric label="Avg heart rate" value={formatMetric(latestSnapshot?.averageHeartRate, " bpm")} />
          </View>
          {!latestSnapshot ? <Text style={styles.caption}>No fitness data found for the selected period.</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}><Ionicons name="calendar-outline" size={22} color={colors.primary} /></View>
            <View style={styles.headerText}><Text style={styles.cardTitle}>Calendar</Text><Text style={styles.caption}>Events stay on this phone.</Text></View>
            <StatusBadge label={statusLabel(calendarStatus)} tone={statusTone(calendarStatus) as any} />
          </View>
          {calendarStatus === "unknown" || calendarStatus === "checking" ? <Text style={styles.caption}>Checking calendar permission...</Text> : null}
          {calendarStatus === "not_determined" ? <AppButton title="Request Calendar Permission" icon="calendar-outline" onPress={() => { void handleRequestCalendar(); }} loading={calendarLoading} style={styles.actionButton} /> : null}
          {calendarStatus === "granted" ? <AppButton title="Refresh Calendar" icon="refresh-outline" variant="secondary" onPress={() => { void refreshEvents(); }} loading={calendarLoading} style={styles.actionButton} /> : null}
          {calendarStatus === "denied" || calendarStatus === "restricted" ? <><Text style={styles.error}>Calendar permission was denied. Enable it in system settings to use local event reminders.</Text><AppButton title="Open Settings" icon="settings-outline" variant="secondary" onPress={() => { void openAppSettings(); }} style={styles.actionButton} /></> : null}
          {calendarStatus === "unsupported" ? <Text style={styles.error}>Calendar integration is not available on this device or simulator.</Text> : null}
          {calendarError ? <Text style={styles.error}>{calendarError}</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Today's Events</Text>
          {todayEvents.length ? todayEvents.map((event) => <View key={event.id} style={styles.eventRow}><Text style={styles.eventTime}>{event.allDay ? "All day" : formatEventTime(event.startDate)}</Text><View style={styles.eventText}><Text style={styles.eventTitle}>{event.title}</Text>{event.location ? <Text style={styles.caption}>{event.location}</Text> : null}</View></View>) : <Text style={styles.caption}>No events found for today.</Text>}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Local Privacy Note</Text>
          <Text style={styles.body}>Fitness and calendar data are read locally from your device and stored only on this phone. They are not uploaded or shared.</Text>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.caption}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: 3 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary },
  card: { gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  headerText: { flex: 1 },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  actionButton: { width: "100%" },
  error: { ...typography.secondary, color: colors.danger, lineHeight: 20 },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { width: "48%", backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: spacing.md },
  metricValue: { ...typography.heading, color: colors.textPrimary },
  eventRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  eventTime: { ...typography.secondary, width: 64, color: colors.textSecondary, fontWeight: "700" },
  eventText: { flex: 1 },
  eventTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "600" }
});
