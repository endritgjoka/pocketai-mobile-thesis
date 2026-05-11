import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing, typography } from "../../config/theme";

export const EmptyState = memo(function EmptyState({ title, body, icon = "sparkles-outline" }: { title: string; body: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}><Ionicons name={icon} size={24} color={colors.primary} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { padding: spacing.xl, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE", marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: "center" },
  body: { ...typography.secondary, color: colors.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 280 }
});
