import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";
import { ModelDownloadService } from "../../services/models/ModelDownloadService";
import { useSettingsStore } from "../../store/useSettingsStore";
import { formatBytes } from "../../utils/fileSize";
import { toUserMessage } from "../../utils/errors";
import { modelDownloadStatusLabel } from "../../utils/statusLabels";

export function ModelDownloadScreen({ route }: NativeStackScreenProps<RootStackParamList, "ModelDownload">) {
  const { modelId } = route.params;
  const model = MODEL_CATALOG.find((item) => item.id === modelId)!;
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading" | "failed" | "completed">("idle");

  const percent = useMemo(() => Math.round(progress * 100), [progress]);
  const statusTone = status === "completed" ? "success" : status === "failed" ? "danger" : status === "downloading" ? "primary" : "neutral";

  const start = async () => {
    try {
      setStatus("downloading");
      await ModelDownloadService.downloadModel(modelId, (event) => {
        setProgress(event.progress);
        setDownloaded(event.downloadedBytes);
        setTotal(event.totalBytes);
      });
      setProgress(1);
      setStatus("completed");
      await updateSettings({ hasCompletedOnboarding: true, activeModelId: modelId });
    } catch (error) {
      setStatus("failed");
      Alert.alert("Download failed", toUserMessage(error, "Check the model URL and network connection."));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}><Ionicons name="cloud-download-outline" size={30} color={colors.primary} /></View>
      <Text style={styles.title}>Download model</Text>
      <Text style={styles.subtitle}>This is a one-time download. After completion, PocketAI works offline.</Text>
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelMeta}>{model.modeLabel} · {model.sizeLabel} · {model.recommendedRam}</Text>
          </View>
          <StatusBadge label={modelDownloadStatusLabel(status)} tone={statusTone} />
        </View>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{percent}%</Text>
          <Text style={styles.bytes}>{formatBytes(downloaded)} / {total ? formatBytes(total) : model.sizeLabel}</Text>
        </View>
        <ProgressBar progress={progress} />
        <Text style={styles.warning}>Keep the app open and stay connected until the download finishes.</Text>
      </AppCard>
      <View style={styles.actions}>
        <AppButton title={status === "failed" ? "Retry download" : status === "completed" ? "Completed" : "Start download"} icon="download-outline" loading={status === "downloading"} disabled={status === "completed"} onPress={start} />
        {status === "downloading" ? <AppButton title="Cancel" variant="secondary" onPress={() => ModelDownloadService.cancel(modelId)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.appBackground, gap: spacing.lg, justifyContent: "center" },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE", alignSelf: "center" },
  title: { ...typography.screenTitle, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22, textAlign: "center" },
  card: { gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardText: { flex: 1 },
  modelName: { ...typography.cardTitle, color: colors.textPrimary },
  modelMeta: { ...typography.secondary, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressText: { ...typography.sectionTitle, color: colors.primary },
  bytes: { ...typography.caption, color: colors.textMuted },
  warning: { ...typography.caption, color: colors.warning, lineHeight: 18 },
  actions: { gap: spacing.sm }
});
