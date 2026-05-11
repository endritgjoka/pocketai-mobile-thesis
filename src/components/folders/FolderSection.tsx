import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Conversation, Folder } from "../../types";
import { ConversationRow } from "../chat/ConversationRow";
import { colors, radii, spacing, typography } from "../../config/theme";

export const FolderSection = memo(function FolderSection({ folder, conversations, expanded, onToggle, onMenu, onConversationPress, onConversationMenu }: {
  folder: Pick<Folder, "id" | "name">;
  conversations: Conversation[];
  expanded: boolean;
  onToggle: () => void;
  onMenu: () => void;
  onConversationPress: (conversation: Conversation) => void;
  onConversationMenu: (conversation: Conversation) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Pressable onPress={onToggle} style={styles.headerMain}>
          <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={colors.textMuted} />
          <Ionicons name={folder.id === "ungrouped" ? "albums-outline" : "folder-outline"} size={19} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>{folder.name}</Text>
          <Text style={styles.count}>{conversations.length}</Text>
        </Pressable>
        <Pressable onPress={onMenu} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></Pressable>
      </View>
      {expanded ? conversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} onPress={() => onConversationPress(conversation)} onMenu={() => onConversationMenu(conversation)} />) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, paddingHorizontal: spacing.md },
  headerMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 46 },
  title: { ...typography.sectionTitle, color: colors.textPrimary, flex: 1 },
  count: { ...typography.caption, color: colors.textMuted, fontWeight: "700" }
});
