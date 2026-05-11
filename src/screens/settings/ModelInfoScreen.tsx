import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { AppCard } from "../../components/ui/AppCard";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";

export function ModelInfoScreen({ route }: NativeStackScreenProps<RootStackParamList, "ModelInfo">) {
  const model = MODEL_CATALOG.find((item) => item.id === route.params.modelId);
  if (!model) return null;
  return (
    <View style={styles.container}>
      <AppCard>
        <Text style={styles.title}>{model.name}</Text>
        <Text style={styles.meta}>{model.modeLabel}</Text>
        <Text style={styles.body}>Size: {model.sizeLabel}</Text>
        <Text style={styles.body}>Recommended device: {model.recommendedRam}</Text>
        <Text style={styles.body}>Context size: {model.defaultContextSize}</Text>
        <Text style={styles.body}>Purpose: {model.description}</Text>
        <Text style={styles.body}>URL: {model.url}</Text>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.textPrimary },
  meta: { ...typography.cardTitle, color: colors.primary, marginVertical: 8 },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 23, marginTop: 6 }
});
