import React, { memo } from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, hitSlop, radii } from "../../config/theme";

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export const IconButton = memo(function IconButton({ name, onPress, size = 22, color = colors.textPrimary, backgroundColor = "transparent", disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.button, { backgroundColor }, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 }
});
