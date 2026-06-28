import * as FileSystem from "expo-file-system";
import { MODEL_CATALOG } from "../../config/models";
import { ModelId } from "../../types";

const modelDir = `${FileSystem.documentDirectory ?? ""}models/`;

export const ModelFileService = {
  modelDir,

  getCatalogItem(modelId: ModelId) {
    const item = MODEL_CATALOG.find((model) => model.id === modelId);
    if (!item) throw new Error(`Unknown model: ${modelId}`);
    return item;
  },

  async ensureModelDir() {
    const info = await FileSystem.getInfoAsync(modelDir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
  },

  async getLocalModelPath(modelId: ModelId) {
    const item = this.getCatalogItem(modelId);
    await this.ensureModelDir();
    return `${modelDir}${item.filename}`;
  },

  async modelExists(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && !info.isDirectory;
  },

  async getModelSize(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    const info = await FileSystem.getInfoAsync(path, { size: true });
    return info.exists && "size" in info ? info.size ?? null : null;
  },

  async deleteModel(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }
};
