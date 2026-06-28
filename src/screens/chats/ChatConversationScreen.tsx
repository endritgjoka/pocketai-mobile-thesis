import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { ChatComposer } from "../../components/chat/ChatComposer";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { SuggestedPromptChips } from "../../components/chat/SuggestedPromptChips";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconButton } from "../../components/ui/IconButton";
import { ModelSelectorModal } from "../../components/chat/ModelSelectorModal";
import { TextPromptModal } from "../../components/ui/TextPromptModal";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";
import { chatRepository } from "../../repositories/chatRepository";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { LlamaService } from "../../services/llm/LlamaService";
import { buildPrioritizedPrompt } from "../../services/context";
import { estimateTokens } from "../../services/llm/tokenEstimate";
import { useChatStore } from "../../store/useChatStore";
import { useModelStore } from "../../store/useModelStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { Conversation, Message, ModelId } from "../../types";
import { createId, toUserMessage } from "../../utils/errors";
import { nowIso } from "../../utils/dates";
import { generateConversationTitle } from "../../utils/conversationTitle";

export function ChatConversationScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "ChatConversation">) {
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const listRef = useRef<FlatList>(null);
  const isNearBottomRef = useRef(true);
  const stopRef = useRef(false);
  const streamBufferRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messages = useChatStore((state) => state.messages);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const refreshChats = useChatStore((state) => state.refreshChats);
  const models = useModelStore((state) => state.models);
  const loadModels = useModelStore((state) => state.loadModels);
  const activeModelId = useSettingsStore((state) => state.activeModelId);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const useMockInference = useSettingsStore((state) => state.useMockInference);
  const contextSize = useSettingsStore((state) => state.contextSize);
  const temperature = useSettingsStore((state) => state.temperature);
  const topP = useSettingsStore((state) => state.topP);
  const maxTokens = useSettingsStore((state) => state.maxTokens);
  const contextPrioritizationEnabled = useSettingsStore((state) => state.contextPrioritizationEnabled);
  const prioritizationStrategy = useSettingsStore((state) => state.prioritizationStrategy);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{ id: string; role: "assistant"; content: string; createdAt: string } | null>(null);

  const selectedModelId = (conversation?.modelId as ModelId | undefined) ?? activeModelId;
  const activeModel = useMemo(() => MODEL_CATALOG.find((item) => item.id === selectedModelId), [selectedModelId]);
  const downloaded = useMemo(() => Boolean(selectedModelId && models.some((item) => item.id === selectedModelId && item.downloaded)), [selectedModelId, models]);
  const modelReady = Boolean(selectedModelId && (downloaded || useMockInference));

  const refresh = useCallback(async () => {
    await Promise.all([loadMessages(conversationId), loadModels()]);
    setConversation(await chatRepository.getConversation(conversationId));
  }, [conversationId, loadMessages, loadModels]);

  useEffect(() => { void refresh(); return () => { if (!generating) void chatRepository.deleteEmptyConversation(conversationId).then(refreshChats); }; }, [conversationId, generating, refresh, refreshChats]);

  const scrollToBottom = useCallback((animated = true) => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated })), []);
  useEffect(() => { if (isNearBottomRef.current) scrollToBottom(false); }, [messages.length, streamingMessage?.content, scrollToBottom]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    isNearBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
  }, []);

  const flushStream = useCallback(() => {
    if (!streamBufferRef.current) return;
    const chunk = streamBufferRef.current;
    streamBufferRef.current = "";
    setStreamingMessage((current) => current ? { ...current, content: current.content + chunk } : current);
  }, []);

  const appendToken = useCallback((token: string) => {
    streamBufferRef.current += token;
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => { flushTimerRef.current = null; flushStream(); }, 38);
    }
  }, [flushStream]);

  const stopGeneration = useCallback(() => { stopRef.current = true; setGenerating(false); }, []);

  const sendText = useCallback(async (raw: string) => {
    const content = raw.trim();
    if (!content || generating) return;
    if (!selectedModelId) return Alert.alert("Model not selected", "Download or select a model in Settings first.");
    if (!modelReady) return Alert.alert("Model not ready", "Download the selected model or enable mock inference in Settings for UI testing.");
    setInput("");
    setGenerating(true);
    stopRef.current = false;
    isNearBottomRef.current = true;
    const draftId = createId("draft");
    setStreamingMessage({ id: draftId, role: "assistant", content: "", createdAt: nowIso() });
    try {
      const firstMessage = messages.length === 0;
      const user = await chatRepository.addMessage({ conversationId, role: "user", content, tokenCount: estimateTokens(content) });
      if (firstMessage && (!conversation || conversation.title === "New conversation" || conversation.title === "New Chat")) {
        await chatRepository.renameConversation(conversationId, generateConversationTitle(content));
      }
      await loadMessages(conversationId);
      scrollToBottom();
      const current = [...messages, user].map(({ role, content: text }) => ({ role, content: text }));
      let systemPrompt: string | undefined;
      let prioritizationNote: string | null = null;
      if (contextPrioritizationEnabled) {
        const built = await buildPrioritizedPrompt({
          query: content,
          recentMessages: current,
          conversationId,
          includeChat: false,
          includeCalendar: true,
          includeHealth: true,
          strategy: prioritizationStrategy,
        });
        systemPrompt = built.systemPromptWithContext;
        prioritizationNote = `strategy=${built.prioritization.strategy}; selected=${built.prioritization.selected.length}/${built.candidatesConsidered}; ctxTokens=${built.prioritization.tokensUsed}; embed=${built.embeddingPath}`;
      }
      const result = await LlamaService.generateChatCompletion({ modelId: selectedModelId, messages: current, systemPrompt, contextSize, temperature, topP, maxTokens, useMockInference, onToken: appendToken, shouldStop: () => stopRef.current });
      flushStream();
      const finalText = result.text.trim() || "Generation stopped.";
      await chatRepository.addMessage({ conversationId, role: "assistant", content: result.stopped ? finalText + "\n\n[Stopped]" : finalText, tokenCount: result.stats.outputTokens, stats: result.stats });
      const runNote = [result.stopped ? "Stopped by user" : null, prioritizationNote].filter(Boolean).join(" | ") || null;
      await benchmarkRepository.addRun({ id: createId("bench"), taskType: "chat", modelId: selectedModelId, documentId: null, chunkStrategy: null, topK: null, promptText: content, promptTokenEstimate: estimateTokens(content), outputTokenEstimate: result.stats.outputTokens, retrievalTimeMs: null, generationTimeMs: result.stats.totalTimeMs, totalTimeMs: result.stats.totalTimeMs, tokensPerSecond: result.stats.tokensPerSecond, selectedChunkIds: null, notes: runNote, createdAt: nowIso() });
      setStreamingMessage(null);
      await refresh();
      await refreshChats();
      scrollToBottom();
    } catch (error) {
      flushStream();
      const partial = streamBufferRef.current || streamingMessage?.content || "";
      if (partial.trim()) await chatRepository.addMessage({ conversationId, role: "assistant", content: partial.trim() + "\n\n[Error: " + toUserMessage(error) + "]", tokenCount: estimateTokens(partial) });
      Alert.alert("Inference failed", toUserMessage(error));
      setStreamingMessage(null);
      await refresh();
    } finally {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      streamBufferRef.current = "";
      setGenerating(false);
    }
  }, [appendToken, contextPrioritizationEnabled, contextSize, conversation, conversationId, flushStream, generating, loadMessages, maxTokens, messages, modelReady, prioritizationStrategy, refresh, refreshChats, scrollToBottom, selectedModelId, streamingMessage?.content, temperature, topP, useMockInference]);

  const selectModel = useCallback(async (modelId: ModelId) => {
    if (modelId === selectedModelId) return setModelModalVisible(false);
    await updateSettings({ activeModelId: modelId });
    await chatRepository.updateConversationModel(conversationId, modelId);
    setModelModalVisible(false);
    await refresh();
  }, [conversationId, refresh, selectedModelId, updateSettings]);

  const openMenu = useCallback(() => {
    Alert.alert(conversation?.title ?? "Conversation", undefined, [
      { text: "Rename", onPress: () => setRenameVisible(true) },
      { text: "Delete", style: "destructive", onPress: () => Alert.alert("Delete this conversation?", "This will permanently remove all messages and benchmark links for this conversation from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await chatRepository.deleteConversation(conversationId); await refreshChats(); navigation.goBack(); } }]) },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [conversation?.title, conversationId, navigation, refresh, refreshChats]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: conversation?.title ?? "Conversation",
      headerBackTitle: "",
      headerRight: () => <IconButton name="ellipsis-horizontal" onPress={openMenu} />,
      headerTitle: () => (
        <View style={styles.nativeHeaderTitle}>
          <Text style={styles.headerTitle} numberOfLines={1}>{conversation?.title ?? "Conversation"}</Text>
          <Pressable onPress={() => setModelModalVisible(true)} style={styles.modelPill} hitSlop={8}>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{activeModel?.name ?? "No model selected"} ▾</Text>
          </Pressable>
        </View>
      )
    });
  }, [activeModel?.name, conversation?.title, navigation, openMenu]);

  const listData = useMemo(() => messages, [messages]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {!modelReady ? <View style={styles.banner}><Ionicons name="alert-circle-outline" size={18} color={colors.warning} /><Text style={styles.bannerText}>Download or select a model to start chatting.</Text></View> : null}
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}>
        <FlatList
          style={styles.messageList}
          ref={listRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} onDelete={async () => { await chatRepository.deleteMessage(item.id); await refresh(); }} />}
          ListFooterComponent={streamingMessage ? <MessageBubble draft={streamingMessage} isStreaming={generating} /> : null}
          ListEmptyComponent={<View style={styles.emptyWrap}><EmptyState icon="sparkles-outline" title="How can I help?" body="Ask a question or test local inference on this device." /><SuggestedPromptChips onSelect={setInput} /></View>}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={80}
          onContentSizeChange={() => { if (isNearBottomRef.current) scrollToBottom(); }}
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={16}
          maxToRenderPerBatch={12}
          windowSize={9}
        />
        <ChatComposer value={input} onChangeText={setInput} onSend={() => { void sendText(input); }} disabled={!modelReady} isGenerating={generating} onStop={stopGeneration} bottomInset={insets.bottom} />
      </KeyboardAvoidingView>
      <ModelSelectorModal visible={modelModalVisible} activeModelId={selectedModelId ?? null} downloadedModels={models} onSelect={selectModel} onClose={() => setModelModalVisible(false)} />
      <TextPromptModal visible={renameVisible} title="Rename conversation" initialValue={conversation?.title ?? ""} onCancel={() => setRenameVisible(false)} onConfirm={async (title) => { if (title.trim()) { await chatRepository.renameConversation(conversationId, title); await refresh(); await refreshChats(); } setRenameVisible(false); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  nativeHeaderTitle: { alignItems: "center", justifyContent: "center", maxWidth: 230 },
  headerTitle: { ...typography.sectionTitle, color: colors.textPrimary, maxWidth: "100%" },
  modelPill: { marginTop: 3, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, backgroundColor: colors.surfaceMuted },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FFFBEB", borderBottomWidth: 1, borderBottomColor: "#FDE68A", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  bannerText: { ...typography.secondary, color: colors.textPrimary, flex: 1 },
  keyboard: { flex: 1, backgroundColor: colors.background },
  messageList: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  emptyWrap: { flex: 1, justifyContent: "center", paddingBottom: 90 }
});
