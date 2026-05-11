import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, radii, typography } from "../../config/theme";

export function ChunkBadge({ label }: { label: string }) {
  return <Text style={styles.badge}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: { ...typography.caption, color: colors.primary, backgroundColor: "#DBEAFE", borderRadius: radii.button, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }
});
