import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, typography } from "../../config/theme";
import { ModelCatalogItem } from "../../types";

export function ModelCard({ model, selected, onPress }: { model: ModelCatalogItem; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <Text style={styles.mode}>{model.modeLabel}</Text>
      <Text style={styles.title}>{model.name}</Text>
      <Text style={styles.meta}>{model.sizeLabel} · {model.recommendedRam}</Text>
      <Text style={styles.body}>{model.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: 16, gap: 7 },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  mode: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  body: { ...typography.body, color: colors.textSecondary }
});
