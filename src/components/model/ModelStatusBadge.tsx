import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, radii, typography } from "../../config/theme";

export function ModelStatusBadge({ downloaded }: { downloaded: boolean }) {
  return <Text style={[styles.badge, downloaded ? styles.ok : styles.missing]}>{downloaded ? "Downloaded" : "Not downloaded"}</Text>;
}

const styles = StyleSheet.create({
  badge: { ...typography.caption, borderRadius: radii.button, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, fontWeight: "700" },
  ok: { color: colors.success, backgroundColor: "#DCFCE7" },
  missing: { color: colors.warning, backgroundColor: "#FEF3C7" }
});
