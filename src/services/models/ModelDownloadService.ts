import * as FileSystem from "expo-file-system";
import { MODEL_CATALOG } from "../../config/models";
import { modelRepository } from "../../repositories/modelRepository";
import { settingsRepository } from "../../repositories/settingsRepository";
import { ModelId } from "../../types";
import { nowIso } from "../../utils/dates";
import { ModelFileService } from "./ModelFileService";

export type ModelDownloadProgress = {
  status: "idle" | "downloading" | "downloaded" | "failed" | "cancelled";
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  error?: string;
};

class DownloadService {
  private activeDownloads = new Map<ModelId, FileSystem.DownloadResumable>();

  async downloadModel(modelId: ModelId, onProgress?: (progress: ModelDownloadProgress) => void) {
    const model = MODEL_CATALOG.find((item) => item.id === modelId);
    if (!model) throw new Error("Unknown model selected.");
    await ModelFileService.ensureModelDir();
    const destination = await ModelFileService.getLocalModelPath(modelId);
    // Shkarkimi kryhet në një skedar të përkohshëm dhe zhvendoset vetëm pasi përfundon.
    // Përndryshe, nëse procesi ndërpritet, në shtegun përfundimtar do të mbetej një skedar
    // i cunguar që do të dukej si model i shkarkuar dhe do të dështonte gjatë ngarkimit.
    const partial = `${destination}.part`;
    for (const path of [destination, partial]) {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
    }

    const resumable = FileSystem.createDownloadResumable(model.url, partial, {}, (event) => {
      const total = event.totalBytesExpectedToWrite > 0 ? event.totalBytesExpectedToWrite : null;
      onProgress?.({ status: "downloading", progress: total ? event.totalBytesWritten / total : 0, downloadedBytes: event.totalBytesWritten, totalBytes: total });
    });
    this.activeDownloads.set(modelId, resumable);
    try {
      const result = await resumable.downloadAsync();
      this.activeDownloads.delete(modelId);
      if (!result?.uri) throw new Error("Model download did not complete.");
      // Serveri mund te kthejë një përgjigje gabimi (për shembull 429 kur kërkesat janë
      // shumë të shpeshta) dhe trupi i saj shkruhet në skedar njësoj si të dhënat e modelit.
      // Pa këtë kontroll, një faqe HTML prej pak kilobajtësh do të ruhej si model i vlefshëm.
      const status = (result as { status?: number }).status;
      if (typeof status === "number" && (status < 200 || status >= 300)) {
        throw new Error(`Model download failed with HTTP status ${status}.`);
      }
      const partialInfo = await FileSystem.getInfoAsync(partial, { size: true });
      if (!partialInfo.exists || partialInfo.isDirectory) throw new Error("Downloaded model file could not be verified.");
      // Asnjë model GGUF nuk është nën këtë prag, prandaj një skedar më i vogël tregon
      // se u shkarkua diçka tjetër dhe jo modeli.
      const MIN_MODEL_BYTES = 50 * 1024 * 1024;
      const partialSize = "size" in partialInfo ? partialInfo.size ?? 0 : 0;
      if (partialSize < MIN_MODEL_BYTES) {
        throw new Error(`Downloaded file is only ${Math.round(partialSize / 1024)} KB, which is not a valid model.`);
      }
      await FileSystem.moveAsync({ from: partial, to: destination });
      const info = await FileSystem.getInfoAsync(destination, { size: true });
      if (!info.exists || info.isDirectory) throw new Error("Downloaded model file could not be verified.");
      const sizeBytes = "size" in info ? info.size ?? null : null;
      await modelRepository.upsert({ id: modelId, filename: model.filename, localPath: destination, downloaded: true, downloadedAt: nowIso(), sizeBytes });
      await settingsRepository.setActiveModel(modelId);
      onProgress?.({ status: "downloaded", progress: 1, downloadedBytes: sizeBytes ?? 0, totalBytes: sizeBytes });
      return destination;
    } catch (error) {
      this.activeDownloads.delete(modelId);
      await FileSystem.deleteAsync(partial, { idempotent: true }).catch(() => undefined);
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
      onProgress?.({ status: "failed", progress: 0, downloadedBytes: 0, totalBytes: null, error: error instanceof Error ? error.message : "Download failed" });
      throw error;
    }
  }

  async pause(modelId: ModelId) {
    const download = this.activeDownloads.get(modelId);
    if (download) await download.pauseAsync();
  }

  async cancel(modelId: ModelId) {
    const download = this.activeDownloads.get(modelId);
    if (download) {
      await download.cancelAsync();
      this.activeDownloads.delete(modelId);
    }
    await ModelFileService.deleteModel(modelId);
  }

  async deleteModel(modelId: ModelId) {
    await ModelFileService.deleteModel(modelId);
    await modelRepository.markDeleted(modelId);
    const settings = await settingsRepository.getSettings();
    if (settings.activeModelId === modelId) await settingsRepository.patchSettings({ activeModelId: null });
  }

  getLocalModelPath(modelId: ModelId) {
    return ModelFileService.getLocalModelPath(modelId);
  }
}

export const ModelDownloadService = new DownloadService();
