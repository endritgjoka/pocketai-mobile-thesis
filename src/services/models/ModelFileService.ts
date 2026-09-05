import * as FileSystem from "expo-file-system";
import { MODEL_CATALOG } from "../../config/models";
import { ModelId } from "../../types";

const modelDir = `${FileSystem.documentDirectory ?? ""}models/`;

// Emërtimi i hershëm i skedarëve ishte `<id>.gguf`, ndërsa tani përdoret emri i plotë i
// modelit nga katalogu. Skedarët e shkarkuar para këtij ndryshimi do të dukeshin si të
// pashkarkuar dhe do të kërkonin rishkarkim prej disa gigabajtësh, prandaj riemërtohen
// automatikisht kur gjenden.
const legacyFilenames = (modelId: ModelId): string[] => [`${modelId}.gguf`];

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

  /**
   * Kërkon një skedar me emërtim të vjetër dhe e riemërton në emrin aktual.
   * Kthen true vetëm nëse u krye një riemërtim, që thirrësi të mund ta rilexojë skedarin.
   */
  async adoptLegacyFile(modelId: ModelId) {
    const item = this.getCatalogItem(modelId);
    await this.ensureModelDir();
    const canonical = `${modelDir}${item.filename}`;
    if ((await FileSystem.getInfoAsync(canonical)).exists) return false;

    for (const name of legacyFilenames(modelId)) {
      if (name === item.filename) continue;
      const legacy = `${modelDir}${name}`;
      const info = await FileSystem.getInfoAsync(legacy);
      if (info.exists && !info.isDirectory) {
        await FileSystem.moveAsync({ from: legacy, to: canonical });
        return true;
      }
    }
    return false;
  },

  async modelExists(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    let info = await FileSystem.getInfoAsync(path);
    if (!info.exists && (await this.adoptLegacyFile(modelId))) {
      info = await FileSystem.getInfoAsync(path);
    }
    return info.exists && !info.isDirectory;
  },

  async getModelSize(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    const info = await FileSystem.getInfoAsync(path, { size: true });
    return info.exists && "size" in info ? info.size ?? null : null;
  },

  async deleteModel(modelId: ModelId) {
    const path = await this.getLocalModelPath(modelId);
    // Fshihet edhe skedari i përkohshëm i një shkarkimi të ndërprerë, nëse ka mbetur.
    for (const target of [path, `${path}.part`]) {
      const info = await FileSystem.getInfoAsync(target);
      if (info.exists) await FileSystem.deleteAsync(target, { idempotent: true });
    }
  }
};
