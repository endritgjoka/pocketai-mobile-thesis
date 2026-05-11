import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
    <View style={styles.container}>
      <Text style={styles.title}>Choose your first AI model</Text>
      <View style={styles.list}>
        {MODEL_CATALOG.map((model) => <ModelCard key={model.id} model={model} selected={selected === model.id} onPress={() => setSelected(model.id)} />)}
      </View>
      <Text style={styles.hint}>Not sure? Start with Light Mode. You can switch later in Settings.</Text>
      <AppButton title="Download & Continue" onPress={() => navigation.navigate("ModelDownload", { modelId: selected })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.background, gap: spacing.lg, justifyContent: "center" },
  title: { ...typography.title, color: colors.textPrimary },
  list: { gap: 12 },
  hint: { ...typography.body, color: colors.textSecondary }
});
