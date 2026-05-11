import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconButton } from "../../components/ui/IconButton";
import { AppButton } from "../../components/ui/AppButton";
import { FolderSection } from "../../components/folders/FolderSection";
import { MoveConversationModal } from "../../components/folders/MoveConversationModal";
import { TextPromptModal } from "../../components/ui/TextPromptModal";
import { chatRepository } from "../../repositories/chatRepository";
import { folderRepository } from "../../repositories/folderRepository";
import { useChatStore } from "../../store/useChatStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { colors, spacing, typography } from "../../config/theme";
import { Conversation } from "../../types";

export function ChatListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const conversations = useChatStore((state) => state.conversations);
  const folders = useChatStore((state) => state.folders);
  const expandedFolderIds = useChatStore((state) => state.expandedFolderIds);
  const refreshChats = useChatStore((state) => state.refreshChats);
  const toggleFolder = useChatStore((state) => state.toggleFolder);
  const activeModelId = useSettingsStore((state) => state.activeModelId);
  const [search, setSearch] = useState("");
  const [moveTarget, setMoveTarget] = useState<Conversation | null>(null);
  const [prompt, setPrompt] = useState<{ title: string; initialValue?: string; onConfirm: (value: string) => Promise<void> | void } | null>(null);

  useFocusEffect(useCallback(() => { void refreshChats(); }, [refreshChats]));

  const create = useCallback(async (folderId: string | null = null) => {
    if (!activeModelId) return Alert.alert("No active model", "Download or select a model in Settings first.");
    const conversation = await chatRepository.createConversation(activeModelId, "New Chat", folderId);
    await refreshChats();
    navigation.navigate("ChatConversation", { conversationId: conversation.id });
  }, [activeModelId, refreshChats, navigation]);

  const createFolder = useCallback(() => {
    setPrompt({ title: "New folder", initialValue: "", onConfirm: async (name) => { await folderRepository.createFolder(name || "Research"); await refreshChats(); setPrompt(null); } });
  }, [refreshChats]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => item.title.toLowerCase().includes(query) || (item.lastMessage ?? "").toLowerCase().includes(query));
  }, [conversations, search]);

  const sections = useMemo(() => {
    const all = [{ id: "ungrouped", name: "Ungrouped", conversations: filtered.filter((item) => !item.folderId) }, ...folders.map((folder) => ({ ...folder, conversations: filtered.filter((item) => item.folderId === folder.id) }))];
    return all.filter((section) => section.id === "ungrouped" || section.conversations.length > 0 || !search.trim());
  }, [filtered, folders, search]);

  const conversationMenu = useCallback((conversation: Conversation) => {
    Alert.alert(conversation.title, undefined, [
      { text: "Rename", onPress: () => setPrompt({ title: "Rename conversation", initialValue: conversation.title, onConfirm: async (title) => { if (title.trim()) { await chatRepository.renameConversation(conversation.id, title); await refreshChats(); } setPrompt(null); } }) },
      { text: "Move to folder", onPress: () => setMoveTarget(conversation) },
      { text: "Delete", style: "destructive", onPress: () => Alert.alert("Delete this conversation?", "This will permanently remove all messages and benchmark links for this conversation from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await chatRepository.deleteConversation(conversation.id); await refreshChats(); } }]) },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [refreshChats]);

  const folderMenu = useCallback((folderId: string, name: string) => {
    if (folderId === "ungrouped") return create(null);
    Alert.alert(name, undefined, [
      { text: "New chat in folder", onPress: () => create(folderId) },
      { text: "Rename folder", onPress: () => setPrompt({ title: "Rename folder", initialValue: name, onConfirm: async (title) => { if (title.trim()) { await folderRepository.renameFolder(folderId, title); await refreshChats(); } setPrompt(null); } }) },
      { text: "Delete folder", style: "destructive", onPress: () => Alert.alert("Delete folder", "Delete folder only or delete folder and conversations?", [{ text: "Cancel", style: "cancel" }, { text: "Delete folder only", onPress: async () => { await folderRepository.deleteFolderOnly(folderId); await refreshChats(); } }, { text: "Delete folder and conversations", style: "destructive", onPress: async () => { await folderRepository.deleteFolderAndConversations(folderId); await refreshChats(); } }]) },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [create, refreshChats]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Chats</Text><Text style={styles.subtitle}>Offline conversations organized in folders</Text></View>
        <View style={styles.headerActions}><IconButton name="folder-outline" onPress={createFolder} /><IconButton name="add" color="#fff" backgroundColor={colors.primary} onPress={() => create(null)} /></View>
      </View>
      <View style={styles.searchWrap}><Ionicons name="search" size={18} color={colors.textMuted} /><AppTextInput style={styles.search} placeholder="Search conversations" value={search} onChangeText={setSearch} /></View>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FolderSection folder={item} conversations={item.conversations} expanded={expandedFolderIds[item.id] ?? true} onToggle={() => toggleFolder(item.id)} onMenu={() => folderMenu(item.id, item.name)} onConversationPress={(conversation) => navigation.navigate("ChatConversation", { conversationId: conversation.id })} onConversationMenu={conversationMenu} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        ListEmptyComponent={<View style={styles.empty}><EmptyState icon="chatbubble-ellipses-outline" title="Start a local AI conversation" body="Create a chat, organize it in folders, and test offline inference." /><View style={styles.emptyActions}><AppButton title="New Chat" onPress={() => create(null)} /><AppButton title="New Folder" variant="secondary" onPress={createFolder} /></View></View>}
      />
      <MoveConversationModal visible={Boolean(moveTarget)} folders={folders} currentFolderId={moveTarget?.folderId ?? null} onClose={() => setMoveTarget(null)} onMove={async (folderId) => { if (moveTarget) { await chatRepository.updateConversationFolder(moveTarget.id, folderId); await refreshChats(); } setMoveTarget(null); }} />
      <TextPromptModal visible={Boolean(prompt)} title={prompt?.title ?? ""} initialValue={prompt?.initialValue ?? ""} onCancel={() => setPrompt(null)} onConfirm={(value) => { void prompt?.onConfirm(value); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.background, paddingLeft: 14 },
  search: { flex: 1, borderWidth: 0, backgroundColor: "transparent", minHeight: 44, paddingLeft: 0 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1, gap: spacing.md },
  empty: { flex: 1, justifyContent: "center" },
  emptyActions: { gap: spacing.sm, marginTop: spacing.lg }
});
