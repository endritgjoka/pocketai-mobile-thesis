import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../ui/AppButton";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { ModelCatalogItem, LocalModel } from "../../types";
import { colors, radii, spacing, typography } from "../../config/theme";
import { formatBytes } from "../../utils/fileSize";

type Progress = { status: string; progress: number; downloadedBytes: number; totalBytes: number | null; error?: string };

export const ModelManagementCard = memo(function ModelManagementCard({ model, local, active, progress, onDownload, onCancel, onSetActive, onDelete, onInfo }: {
  model: ModelCatalogItem;
  local?: LocalModel;
  active: boolean;
  progress?: Progress;
  onDownload: () => void;
  onCancel: () => void;
  onSetActive: () => void;
  onDelete: () => void;
  onInfo: () => void;
}) {
  const downloaded = Boolean(local?.downloaded);
  const downloading = progress?.status === "downloading";
  const status = active ? "Active" : downloading ? "Downloading" : downloaded ? "Downloaded" : progress?.status === "failed" ? "Failed" : "Not downloaded";
  return (
    <View style={[styles.card, active && styles.activeCard]}>
      <View style={styles.top}>
        <View style={styles.text}>
          <Text style={styles.title}>{model.name}</Text>
          <Text style={styles.meta}>{model.modeLabel} · {model.sizeLabel} · {model.recommendedRam}</Text>
          <Text style={styles.description}>{model.description}</Text>
        </View>
        <StatusBadge label={status} tone={active ? "primary" : downloaded ? "success" : progress?.status === "failed" ? "danger" : "warning"} />
      </View>
      {downloading ? <View style={styles.progressWrap}><ProgressBar progress={progress?.progress ?? 0} /><Text style={styles.progressText}>{Math.round((progress?.progress ?? 0) * 100)}% · {formatBytes(progress?.downloadedBytes ?? 0)}{progress?.totalBytes ? " / " + formatBytes(progress.totalBytes) : ""}</Text></View> : null}
      {progress?.error ? <Text style={styles.error}>{progress.error}</Text> : null}
      <View style={styles.actions}>
        {!downloaded ? <AppButton title={downloading ? "Downloading" : "Download"} icon="download-outline" loading={downloading} onPress={onDownload} style={styles.button} /> : null}
        {downloading ? <AppButton title="Cancel" variant="secondary" onPress={onCancel} style={styles.button} /> : null}
        {downloaded ? <AppButton title={active ? "Active" : "Set Active"} variant="secondary" disabled={active} onPress={onSetActive} style={styles.button} /> : null}
        <AppButton title="Info" variant="secondary" onPress={onInfo} style={styles.button} />
        {downloaded ? <AppButton title="Delete" variant="danger" onPress={onDelete} style={styles.button} /> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  activeCard: { borderColor: colors.primary },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  text: { flex: 1 },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  description: { ...typography.secondary, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  progressWrap: { gap: spacing.sm },
  progressText: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 38, paddingHorizontal: 12 }
});
