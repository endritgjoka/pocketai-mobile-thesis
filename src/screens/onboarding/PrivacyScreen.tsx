import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { colors, spacing, typography } from "../../config/theme";

const checks = ["AI inference runs locally on this device", "No account required", "No cloud inference", "No analytics or tracking", "Works offline after model download"];

export function PrivacyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Privacy">) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Private by design</Text>
      <AppCard style={styles.card}>{checks.map((item) => <Text key={item} style={styles.check}>✓ {item}</Text>)}</AppCard>
      <AppButton title="Continue" onPress={() => navigation.navigate("ModelSelection")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.background, gap: spacing.lg },
  title: { ...typography.title, color: colors.textPrimary },
  card: { gap: 12 },
  check: { ...typography.body, color: colors.textPrimary, lineHeight: 24 }
});
