import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ModelCatalogItem } from "../../types";
import { colors, spacing, typography } from "../../config/theme";

export const ModelSelectorRow = memo(function ModelSelectorRow({ model, downloaded, active, onPress }: { model: ModelCatalogItem; downloaded: boolean; active: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={!downloaded} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, !downloaded && styles.disabled]}>
      <View style={styles.body}>
        <Text style={styles.title}>{model.name}</Text>
        <Text style={styles.meta}>{model.modeLabel} · {model.sizeLabel}{downloaded ? "" : " · Download in Settings"}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <Ionicons name={downloaded ? "ellipse-outline" : "lock-closed-outline"} size={20} color={colors.textMuted} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingVertical: spacing.md },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  body: { flex: 1 },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 }
});
