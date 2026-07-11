import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppButton } from "../../components/ui/AppButton";
import { colors, spacing, typography } from "../../config/theme";

export function WelcomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PocketAI</Text>
      <Text style={styles.subtitle}>Your private AI assistant running directly on your phone.</Text>
      <Text style={styles.body}>PocketAI is designed for empirical research on mobile AI deployment. It runs quantized language models locally and helps evaluate inference and retrieval performance.</Text>
      <AppButton title="Get Started" onPress={() => navigation.navigate("Privacy")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.background, gap: spacing.lg },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { fontSize: 20, fontWeight: "600", color: colors.textPrimary, lineHeight: 28 },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 }
});
