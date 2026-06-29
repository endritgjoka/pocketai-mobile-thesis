import React, { memo, useCallback, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { BenchmarkService } from "../../services/benchmark/BenchmarkService";
import { BenchmarkRun, DocumentRecord } from "../../types";
import { formatShortDate } from "../../utils/dates";
import { toUserMessage } from "../../utils/errors";

export function BenchmarkScreen() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextRuns, nextDocuments] = await Promise.all([benchmarkRepository.listRuns(), documentRepository.listDocuments()]);
    setRuns(nextRuns);
    setDocuments(nextDocuments);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stats = useMemo(() => {
    const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const byModel = runs.reduce<Record<string, { total: number; count: number }>>((acc, run) => {
      acc[run.modelId] = acc[run.modelId] ?? { total: 0, count: 0 };
      acc[run.modelId].total += run.tokensPerSecond ?? 0;
      acc[run.modelId].count += 1;
      return acc;
    }, {});
    const bestModelId = Object.entries(byModel).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0];
    return {
      total: runs.length,
      generation: avg(runs.map((run) => run.generationTimeMs)),
      tps: avg(runs.map((run) => run.tokensPerSecond ?? 0)),
      retrieval: avg(runs.filter((run) => run.retrievalTimeMs !== null).map((run) => run.retrievalTimeMs ?? 0)),
      bestModel: MODEL_CATALOG.find((item) => item.id === bestModelId)?.name ?? "-"
    };
  }, [runs]);

  const runChat = useCallback(async () => {
    try { setLoading(true); await BenchmarkService.runChatPrompt(); await load(); } catch (error) { Alert.alert("Benchmark failed", toUserMessage(error)); } finally { setLoading(false); }
  }, [load]);

  const runDocument = useCallback(async () => {
    if (!documents[0]) return Alert.alert("No document", "Import a document before running document Q&A benchmarks.");
    try { setLoading(true); await BenchmarkService.runDocumentBenchmarks(documents[0].id); await load(); } catch (error) { Alert.alert("Benchmark failed", toUserMessage(error)); } finally { setLoading(false); }
  }, [documents, load]);

  const modelName = useCallback((id: string) => MODEL_CATALOG.find((m) => m.id === id)?.name ?? id, []);

  const runModelSweep = useCallback(async () => {
    try {
      setLoading(true);
      await BenchmarkService.runModelSweep((p) => setSweepStatus(`Model sweep ${p.current}/${p.total}: ${modelName(p.modelId)}`));
      await load();
    } catch (error) { Alert.alert("Sweep failed", toUserMessage(error)); } finally { setLoading(false); setSweepStatus(null); }
  }, [load, modelName]);

  const runRagSweep = useCallback(async () => {
    if (!documents[0]) return Alert.alert("No document", "Import a document before running the RAG sweep.");
    try {
      setLoading(true);
      await BenchmarkService.runDocumentSweep(documents[0].id, (p) => setSweepStatus(`RAG sweep ${p.current}/${p.total}: ${modelName(p.modelId)} · ${p.chunkSize} tokens`));
      await load();
    } catch (error) { Alert.alert("Sweep failed", toUserMessage(error)); } finally { setLoading(false); setSweepStatus(null); }
  }, [documents, load, modelName]);

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Benchmarks</Text>
        <Text style={styles.subtitle}>Thesis metrics for local inference and retrieval</Text>
      </View>
      <View style={styles.grid}>
        <StatCard label="Total runs" value={String(stats.total)} />
        <StatCard label="Avg generation" value={`${(stats.generation / 1000).toFixed(1)}s`} accent={colors.success} />
        <StatCard label="Avg tokens/sec" value={stats.tps.toFixed(1)} accent={colors.primary} />
        <StatCard label="Avg retrieval" value={`${Math.round(stats.retrieval)}ms`} accent={colors.warning} />
      </View>
      <View style={styles.bestCard}>
        <Text style={styles.bestLabel}>Best current model</Text>
        <Text style={styles.bestValue}>{stats.bestModel}</Text>
      </View>
      {sweepStatus ? <View style={styles.sweepBanner}><Text style={styles.sweepText}>{sweepStatus}</Text></View> : null}
      <View style={styles.actions}>
        <AppButton title="Run test prompt" icon="play" loading={loading} onPress={runChat} />
        <AppButton title="Model sweep (all models)" icon="layers-outline" variant="secondary" loading={loading} onPress={runModelSweep} />
        <AppButton title="RAG sweep (models × chunks)" icon="git-compare-outline" variant="secondary" loading={loading} onPress={runRagSweep} />
        <AppButton title="Run RAG (active model)" icon="document-text-outline" variant="ghost" loading={loading} onPress={runDocument} />
        <View style={styles.exportRow}>
          <AppButton title="Export CSV" icon="download-outline" variant="secondary" onPress={() => BenchmarkService.exportCsv().catch((error) => Alert.alert("Export failed", toUserMessage(error)))} style={styles.exportButton} />
          <AppButton title="Export JSON" icon="code-outline" variant="secondary" onPress={() => BenchmarkService.exportJson().catch((error) => Alert.alert("Export failed", toUserMessage(error)))} style={styles.exportButton} />
        </View>
      </View>
      <Text style={styles.sectionTitle}>Recent runs</Text>
    </View>
  );

  const renderRun = useCallback(({ item }: { item: BenchmarkRun }) => <RunRow run={item} />, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={renderRun}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListEmptyComponent={<EmptyState icon="bar-chart-outline" title="No benchmark runs" body="Run a test prompt or document benchmark to collect measurements for your thesis." />}
      />
    </SafeAreaView>
  );
}

const RunRow = memo(function RunRow({ run }: { run: BenchmarkRun }) {
  const model = MODEL_CATALOG.find((item) => item.id === run.modelId);
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <StatusBadge label={run.taskType === "chat" ? "Chat" : "Document Q&A"} tone={run.taskType === "chat" ? "primary" : "success"} />
        <Text style={styles.date}>{formatShortDate(run.createdAt)}</Text>
      </View>
      <Text style={styles.runTitle}>{model?.name ?? run.modelId}</Text>
      <Text style={styles.runMeta}>{(run.totalTimeMs / 1000).toFixed(1)}s · {run.tokensPerSecond?.toFixed(1) ?? "0"} tok/s{run.chunkStrategy ? ` · ${run.chunkStrategy.replace("fixed_", "")} tokens` : ""}</Text>
    </View>
  );
}, (prev, next) =>
  prev.run.id === next.run.id &&
  prev.run.totalTimeMs === next.run.totalTimeMs &&
  prev.run.tokensPerSecond === next.run.tokensPerSecond &&
  prev.run.createdAt === next.run.createdAt
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  headerContent: { gap: spacing.md, paddingTop: spacing.md },
  header: { marginBottom: spacing.xs },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bestCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg },
  bestLabel: { ...typography.caption, color: colors.textMuted, textTransform: "uppercase", fontWeight: "700" },
  bestValue: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: 6 },
  actions: { gap: spacing.sm },
  exportRow: { flexDirection: "row", gap: spacing.sm },
  exportButton: { flex: 1 },
  sweepBanner: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 14, padding: spacing.md },
  sweepText: { ...typography.secondary, color: colors.primary },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.sm },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  date: { ...typography.caption, color: colors.textMuted },
  runTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  runMeta: { ...typography.secondary, color: colors.textSecondary, marginTop: 6 }
});
