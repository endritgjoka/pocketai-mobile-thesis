import React, { memo } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { colors, radii, typography } from "../../config/theme";

export const AppTextInput = memo(function AppTextInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />;
});

const styles = StyleSheet.create({
  input: {
    minHeight: 46,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary
  }
});
