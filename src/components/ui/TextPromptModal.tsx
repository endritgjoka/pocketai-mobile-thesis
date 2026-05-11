import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { AppModal } from "./AppModal";
import { AppButton } from "./AppButton";
import { colors, spacing, typography } from "../../config/theme";

export function TextPromptModal({ visible, title, initialValue = "", placeholder, confirmLabel = "Save", onCancel, onConfirm }: { visible: boolean; title: string; initialValue?: string; placeholder?: string; confirmLabel?: string; onCancel: () => void; onConfirm: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (visible) setValue(initialValue); }, [initialValue, visible]);
  return (
    <AppModal visible={visible} title={title} onClose={onCancel}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => onConfirm(value)}
        style={styles.input}
      />
      <View style={styles.actions}>
        <AppButton title="Cancel" variant="secondary" onPress={onCancel} style={styles.button} />
        <AppButton title={confirmLabel} onPress={() => onConfirm(value)} style={styles.button} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  input: { ...typography.body, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: spacing.md, color: colors.textPrimary, backgroundColor: colors.appBackground },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  button: { flex: 1 }
});
