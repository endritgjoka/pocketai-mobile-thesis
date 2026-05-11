import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../config/theme";

const prompts = ["Explain quantization", "Compare mobile LLM models", "Ask about a document", "Create a benchmark plan"];

export const SuggestedPromptChips = memo(function SuggestedPromptChips({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <View style={styles.wrap}>{prompts.map((prompt) => <Pressable key={prompt} onPress={() => onSelect(prompt)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}><Text style={styles.text}>{prompt}</Text></Pressable>)}</View>;
});

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { ...typography.secondary, color: colors.textPrimary, fontWeight: "600" }
});
