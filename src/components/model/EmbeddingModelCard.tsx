import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../ui/AppButton";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { colors, radii, spacing, typography } from "../../config/theme";
import { formatBytes } from "../../utils/fileSize";
import { EMBEDDING_MODEL } from "../../services/embeddings/embeddingCatalog";
import { EmbeddingDownloadProgress, EmbeddingDownloadService } from "../../services/embeddings/EmbeddingDownloadService";
import { toUserMessage } from "../../utils/errors";

export function EmbeddingModelCard() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<EmbeddingDownloadProgress | null>(null);

  const refresh = useCallback(async () => {
    setInstalled(await EmbeddingDownloadService.isInstalled());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const downloading = progress?.status === "downloading";

  const download = useCallback(async () => {
    try {
      setProgress({ status: "downloading", progress: 0, downloadedBytes: 0, totalBytes: null, phase: "onnx" });
      await EmbeddingDownloadService.download((event) => setProgress(event));
      setProgress(null);
      await refresh();
    } catch (error) {
      setProgress(null);
      Alert.alert("Embedding download failed", toUserMessage(error));
      await refresh();
    }
  }, [refresh]);

  const remove = useCallback(async () => {
    await EmbeddingDownloadService.remove();
    await refresh();
  }, [refresh]);

  const cancel = useCallback(async () => {
    await EmbeddingDownloadService.cancel();
    setProgress(null);
    await refresh();
  }, [refresh]);

  const status = downloading ? "Downloading" : installed ? "Installed" : installed === null ? "Checking" : "Not installed";
  const phaseLabel = progress?.phase === "vocab" ? "vocabulary" : "model";

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.text}>
          <Text style={styles.title}>{EMBEDDING_MODEL.name}</Text>
          <Text style={styles.meta}>{EMBEDDING_MODEL.dim}-dim · {EMBEDDING_MODEL.onnxSizeLabel} · {EMBEDDING_MODEL.recommendedRam}</Text>
          <Text style={styles.description}>{EMBEDDING_MODEL.description}</Text>
        </View>
        <StatusBadge label={status} tone={installed ? "success" : downloading ? "warning" : "warning"} />
      </View>
      {downloading ? <View style={styles.progressWrap}><ProgressBar progress={progress?.progress ?? 0} /><Text style={styles.progressText}>{phaseLabel}: {Math.round((progress?.progress ?? 0) * 100)}% · {formatBytes(progress?.downloadedBytes ?? 0)}{progress?.totalBytes ? " / " + formatBytes(progress.totalBytes) : ""}</Text></View> : null}
      <Text style={styles.note}>Without this model, retrieval falls back to lexical (TF-IDF) matching.</Text>
      <View style={styles.actions}>
        {!installed && !downloading ? <AppButton title="Download" icon="download-outline" onPress={() => { void download(); }} style={styles.button} /> : null}
        {downloading ? <AppButton title="Cancel" variant="secondary" onPress={() => { void cancel(); }} style={styles.button} /> : null}
        {installed && !downloading ? <AppButton title="Remove" variant="danger" onPress={() => { void remove(); }} style={styles.button} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  text: { flex: 1 },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  description: { ...typography.secondary, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  progressWrap: { gap: spacing.sm },
  progressText: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 38, paddingHorizontal: 12 }
});
