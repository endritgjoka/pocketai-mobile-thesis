import React, { memo } from "react";
import { StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radii, typography } from "../../config/theme";

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const toneStyles = {
  neutral: { color: colors.textSecondary, backgroundColor: colors.surfaceMuted },
  success: { color: colors.success, backgroundColor: "#DCFCE7" },
  warning: { color: colors.warning, backgroundColor: "#FEF3C7" },
  danger: { color: colors.danger, backgroundColor: "#FEE2E2" },
  primary: { color: colors.primary, backgroundColor: "#DBEAFE" }
};

export const StatusBadge = memo(function StatusBadge({ label, tone = "neutral", style }: { label: string; tone?: Tone; style?: ViewStyle }) {
  return <Text style={[styles.badge, toneStyles[tone], style]}>{label}</Text>;
});

const styles = StyleSheet.create({
  badge: { ...typography.caption, borderRadius: radii.pill, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, fontWeight: "700" }
});
