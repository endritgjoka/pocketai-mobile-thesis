import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MODEL_CATALOG } from "../../config/models";
import { colors, radii, spacing, typography } from "../../config/theme";
import { Conversation } from "../../types";
import { formatShortDate } from "../../utils/dates";

export const ConversationRow = memo(function ConversationRow({ conversation, onPress, onMenu }: { conversation: Conversation; onPress: () => void; onMenu?: () => void }) {
  const model = MODEL_CATALOG.find((item) => item.id === conversation.modelId);
  return (
    <Pressable onPress={onPress} onLongPress={onMenu} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /></View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{conversation.title}</Text>
          <Text style={styles.date}>{formatShortDate(conversation.updatedAt)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>{conversation.lastMessage || "No messages yet"}</Text>
        <Text style={styles.model} numberOfLines={1}>{model?.name ?? conversation.modelId}</Text>
      </View>
      {onMenu ? <Pressable onPress={onMenu} hitSlop={12} style={styles.menu}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></Pressable> : null}
    </Pressable>
  );
}, (prev, next) =>
  prev.conversation.id === next.conversation.id &&
  prev.conversation.title === next.conversation.title &&
  prev.conversation.lastMessage === next.conversation.lastMessage &&
  prev.conversation.updatedAt === next.conversation.updatedAt &&
  prev.conversation.modelId === next.conversation.modelId &&
  prev.conversation.folderId === next.conversation.folderId
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: 14, marginBottom: spacing.sm, alignItems: "center" },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.sectionTitle, color: colors.textPrimary, flex: 1 },
  date: { ...typography.caption, color: colors.textMuted },
  preview: { ...typography.secondary, color: colors.textSecondary, marginTop: 4 },
  model: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  menu: { paddingLeft: spacing.xs }
});
