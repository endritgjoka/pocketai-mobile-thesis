import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { ModelCard } from "../../components/model/ModelCard";
import { AppButton } from "../../components/ui/AppButton";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";
import { ModelId } from "../../types";

export function ModelSelectionScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "ModelSelection">) {
  const [selected, setSelected] = useState<ModelId>("phi3-mini-q4");
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose your first AI model</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {MODEL_CATALOG.map((model) => <ModelCard key={model.id} model={model} selected={selected === model.id} onPress={() => setSelected(model.id)} />)}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.hint}>Not sure? Start with Light Mode. You can switch later in Settings.</Text>
        <AppButton title="Download & Continue" onPress={() => navigation.navigate("ModelDownload", { modelId: selected })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  list: { gap: 12 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  hint: { ...typography.body, color: colors.textSecondary }
});
