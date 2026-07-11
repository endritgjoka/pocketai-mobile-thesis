import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing, typography } from "../../config/theme";
import { DocumentRecord } from "../../types";
import { formatShortDate } from "../../utils/dates";
import { StatusBadge } from "../ui/StatusBadge";

const statusTone = (status: DocumentRecord["status"]) => status === "ready" ? "success" : status === "failed" ? "danger" : status === "imported" ? "warning" : "primary";

export const DocumentRow = memo(function DocumentRow({ document, onPress }: { document: DocumentRecord; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}><Ionicons name="document-text-outline" size={22} color={colors.primary} /></View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{document.title}</Text>
          <StatusBadge label={document.status.charAt(0).toUpperCase() + document.status.slice(1)} tone={statusTone(document.status)} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>{document.fileType.toUpperCase()} · {document.chunkCount} chunks · {document.characterCount.toLocaleString()} chars</Text>
        <Text style={styles.date}>{formatShortDate(document.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}, (prev, next) =>
  prev.document.id === next.document.id &&
  prev.document.title === next.document.title &&
  prev.document.status === next.document.status &&
  prev.document.updatedAt === next.document.updatedAt &&
  prev.document.chunkCount === next.document.chunkCount &&
  prev.document.characterCount === next.document.characterCount
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: 14, marginBottom: spacing.sm },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.sectionTitle, color: colors.textPrimary, flex: 1 },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: 5 },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 6 }
});
