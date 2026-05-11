import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppModal } from "../ui/AppModal";
import { Folder } from "../../types";
import { colors, spacing, typography } from "../../config/theme";

export function MoveConversationModal({ visible, folders, currentFolderId, onMove, onClose }: { visible: boolean; folders: Folder[]; currentFolderId: string | null; onMove: (folderId: string | null) => void; onClose: () => void }) {
  const rows = [{ id: null as string | null, name: "Ungrouped" }, ...folders.map((folder) => ({ id: folder.id, name: folder.name }))];
  return (
    <AppModal visible={visible} title="Move to folder" onClose={onClose}>
      {rows.map((row) => {
        const active = currentFolderId === row.id;
        return <Pressable key={row.id ?? "ungrouped"} onPress={() => onMove(row.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Ionicons name={row.id ? "folder-outline" : "albums-outline"} size={20} color={colors.textSecondary} /><Text style={styles.name}>{row.name}</Text>{active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}</Pressable>;
      })}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { opacity: 0.7 },
  name: { ...typography.body, color: colors.textPrimary, flex: 1 }
});
