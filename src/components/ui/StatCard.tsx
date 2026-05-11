import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../config/theme";

export const StatCard = memo(function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, accent ? { backgroundColor: accent } : null]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: 16 },
  accent: { width: 28, height: 3, borderRadius: 3, backgroundColor: colors.primary, marginBottom: 12 },
  value: { ...typography.heading, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 4 }
});
