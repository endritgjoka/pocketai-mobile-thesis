import React from "react";
import { Text, StyleSheet } from "react-native";
import { MODEL_CATALOG } from "../../config/models";
import { colors, spacing, typography } from "../../config/theme";
import { LocalModel, ModelId } from "../../types";
import { AppModal } from "../ui/AppModal";
import { ModelSelectorRow } from "../model/ModelSelectorRow";

export function ModelSelectorModal({ visible, activeModelId, downloadedModels, onSelect, onClose }: { visible: boolean; activeModelId: string | null; downloadedModels: LocalModel[]; onSelect: (modelId: ModelId) => void; onClose: () => void }) {
  return (
    <AppModal visible={visible} title="Choose model" onClose={onClose}>
      <Text style={styles.hint}>Downloaded models can be used immediately. Other models can be downloaded in Settings.</Text>
      {MODEL_CATALOG.map((model) => {
        const downloaded = downloadedModels.some((item) => item.id === model.id && item.downloaded);
        return <ModelSelectorRow key={model.id} model={model} downloaded={downloaded} active={activeModelId === model.id} onPress={() => onSelect(model.id)} />;
      })}
    </AppModal>
  );
}

const styles = StyleSheet.create({ hint: { ...typography.secondary, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm } });
