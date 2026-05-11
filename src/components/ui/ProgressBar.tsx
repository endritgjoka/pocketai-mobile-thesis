import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../config/theme";

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  fill: { height: 10, backgroundColor: colors.primary }
});
