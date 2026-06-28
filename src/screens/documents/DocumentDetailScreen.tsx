import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { ChatComposer } from "../../components/chat/ChatComposer";
import { TypingIndicator } from "../../components/chat/TypingIndicator";
import { AppCard } from "../../components/ui/AppCard";
import { ChunkBadge } from "../../components/document/ChunkBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { colors, spacing, typography } from "../../config/theme";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { LlamaService } from "../../services/llm/LlamaService";
import { estimateTokens } from "../../services/llm/tokenEstimate";
import { toStrategy } from "../../services/rag/chunkText";
import { buildRagPrompt } from "../../services/rag/ragPrompt";
import { retrieveChunks, RetrievalResult } from "../../services/rag/retrieval";
import { useSettingsStore } from "../../store/useSettingsStore";
import { DocumentRecord } from "../../types";
import { createId, toUserMessage } from "../../utils/errors";
import { nowIso } from "../../utils/dates";

export function DocumentDetailScreen({ route }: NativeStackScreenProps<RootStackParamList, "DocumentDetail">) {
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<RetrievalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const activeModelId = useSettingsStore((state) => state.activeModelId);
  const ragChunkSize = useSettingsStore((state) => state.ragChunkSize);
  const ragTopK = useSettingsStore((state) => state.ragTopK);

  useEffect(() => { void documentRepository.getDocument(route.params.documentId).then(setDoc); }, [route.params.documentId]);

  const strategy = useMemo(() => toStrategy(ragChunkSize), [ragChunkSize]);

  const ask = useCallback(async () => {
    if (!doc || !activeModelId || !question.trim() || loading) return;
    if (doc.status === "failed") {
      Alert.alert("No text extracted", "Text could not be extracted from this file, so document Q&A is unavailable. Try a TXT or DOCX file, or a text-based PDF.");
      return;
    }
    try {
      setLoading(true);
      setAnswer("");
      const chunks = await documentRepository.getChunks(doc.id, strategy);
      const retrievalStarted = Date.now();
      const matches = await retrieveChunks(question, chunks, { topK: ragTopK });
      const retrievalTimeMs = Date.now() - retrievalStarted;
      setSelected(matches);
      const promptMessages = buildRagPrompt(doc.title, question, matches);
      const result = await LlamaService.generateWithCurrentSettings(promptMessages);
      setAnswer(result.text);
      await benchmarkRepository.addRun({
        id: createId("bench"),
        taskType: "document_qa",
        modelId: activeModelId,
        documentId: doc.id,
        chunkStrategy: strategy,
        topK: ragTopK,
        promptText: promptMessages[0].content,
        promptTokenEstimate: estimateTokens(promptMessages[0].content),
        outputTokenEstimate: result.stats.outputTokens,
        retrievalTimeMs,
        generationTimeMs: result.stats.totalTimeMs,
        totalTimeMs: result.stats.totalTimeMs + retrievalTimeMs,
        tokensPerSecond: result.stats.tokensPerSecond,
        selectedChunkIds: JSON.stringify(matches.map((item) => item.id)),
        notes: null,
        createdAt: nowIso()
      });
    } catch (error) {
      Alert.alert("Document Q&A failed", toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }, [activeModelId, doc, loading, question, ragTopK, strategy]);

  if (!doc) return <View style={styles.loading}><Text style={styles.loadingText}>Loading document...</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.iconWrap}><Ionicons name="document-text-outline" size={24} color={colors.primary} /></View>
          <View style={styles.heroText}>
            <Text style={styles.title} numberOfLines={2}>{doc.title}</Text>
            <Text style={styles.subtitle}>{doc.filename}</Text>
          </View>
          <StatusBadge label={doc.status} tone={doc.status === "ready" ? "success" : doc.status === "failed" ? "danger" : "warning"} />
        </View>
        {doc.status === "failed" ? <View style={styles.warning}><Text style={styles.warningText}>Text could not be extracted from this file (e.g. a scanned PDF or one with subset fonts). Document Q&A is unavailable for it.</Text></View> : doc.fileType === "pdf" ? <View style={styles.warning}><Text style={styles.warningText}>PDF text extraction is best-effort. Standard text PDFs work well; scanned or special-font PDFs may extract partially.</Text></View> : null}
        <View style={styles.metaGrid}>
          <Metric label="Type" value={doc.fileType.toUpperCase()} />
          <Metric label="Characters" value={doc.characterCount.toLocaleString()} />
          <Metric label="Chunks" value={String(doc.chunkCount)} />
          <Metric label="Strategy" value={doc.chunkStrategy.replace("fixed_", "")} />
        </View>
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Extracted text preview</Text>
          <Text style={styles.preview}>{doc.text.slice(0, 1400)}</Text>
        </AppCard>
        {selected.length ? <View style={styles.badges}>{selected.map((item) => <ChunkBadge key={item.id} label={`Chunk ${item.chunkIndex}`} />)}</View> : null}
        {loading ? <TypingIndicator /> : null}
        {answer ? <AppCard style={styles.card}><Text style={styles.cardTitle}>Answer</Text><Text style={styles.preview}>{answer}</Text></AppCard> : null}
      </ScrollView>
      <ChatComposer
        value={question}
        onChangeText={setQuestion}
        onSend={ask}
        disabled={!activeModelId || loading}
        isGenerating={loading}
        placeholder="Ask about this document..."
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.appBackground },
  container: { flex: 1, backgroundColor: colors.appBackground },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.appBackground },
  loadingText: { ...typography.body, color: colors.textSecondary },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  heroText: { flex: 1, minWidth: 0 },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  warning: { borderRadius: 16, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", padding: spacing.md },
  warningText: { ...typography.secondary, color: colors.textPrimary, lineHeight: 20 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md },
  metricValue: { ...typography.sectionTitle, color: colors.textPrimary },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  card: { gap: spacing.sm },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  preview: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }
});
