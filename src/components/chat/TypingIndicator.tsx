import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../config/theme";

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Text style={styles.text}>Thinking...</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "flex-start", marginBottom: spacing.md },
  bubble: { maxWidth: "70%", borderRadius: radii.bubble, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.assistantBubble },
  text: { ...typography.body, color: colors.textSecondary }
});
