import * as FileSystem from "expo-file-system";
import { EMBEDDING_MODEL } from "./embeddingCatalog";
import { EmbeddingService } from "./EmbeddingService";

export type EmbeddingDownloadProgress = {
  status: "idle" | "downloading" | "downloaded" | "failed" | "cancelled";
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  phase: "onnx" | "vocab";
  error?: string;
};

class DownloadService {
  private activeOnnx: FileSystem.DownloadResumable | null = null;
  private activeVocab: FileSystem.DownloadResumable | null = null;

  async isInstalled() {
    return EmbeddingService.modelExists();
  }

  async download(onProgress?: (event: EmbeddingDownloadProgress) => void) {
    const onnxPath = await EmbeddingService.getOnnxPath();
    const vocabPath = await EmbeddingService.getVocabPath();

    try {
      const onnxExisting = await FileSystem.getInfoAsync(onnxPath);
      if (onnxExisting.exists) await FileSystem.deleteAsync(onnxPath, { idempotent: true });
      const onnxResumable = FileSystem.createDownloadResumable(EMBEDDING_MODEL.onnxUrl, onnxPath, {}, (event) => {
        const total = event.totalBytesExpectedToWrite > 0 ? event.totalBytesExpectedToWrite : null;
        onProgress?.({
          status: "downloading",
          progress: total ? event.totalBytesWritten / total : 0,
          downloadedBytes: event.totalBytesWritten,
          totalBytes: total,
          phase: "onnx",
        });
      });
      this.activeOnnx = onnxResumable;
      const onnxResult = await onnxResumable.downloadAsync();
      this.activeOnnx = null;
      if (!onnxResult?.uri) throw new Error("ONNX file download failed.");

      const vocabExisting = await FileSystem.getInfoAsync(vocabPath);
      if (vocabExisting.exists) await FileSystem.deleteAsync(vocabPath, { idempotent: true });
      const vocabResumable = FileSystem.createDownloadResumable(EMBEDDING_MODEL.vocabUrl, vocabPath, {}, (event) => {
        const total = event.totalBytesExpectedToWrite > 0 ? event.totalBytesExpectedToWrite : null;
        onProgress?.({
          status: "downloading",
          progress: total ? event.totalBytesWritten / total : 0,
          downloadedBytes: event.totalBytesWritten,
          totalBytes: total,
          phase: "vocab",
        });
      });
      this.activeVocab = vocabResumable;
      const vocabResult = await vocabResumable.downloadAsync();
      this.activeVocab = null;
      if (!vocabResult?.uri) throw new Error("Vocab file download failed.");

      const info = await FileSystem.getInfoAsync(onnxPath, { size: true });
      const sizeBytes = info.exists && "size" in info ? info.size ?? null : null;
      onProgress?.({ status: "downloaded", progress: 1, downloadedBytes: sizeBytes ?? 0, totalBytes: sizeBytes, phase: "vocab" });
      return { onnxPath, vocabPath };
    } catch (error) {
      this.activeOnnx = null;
      this.activeVocab = null;
      await FileSystem.deleteAsync(onnxPath, { idempotent: true }).catch(() => undefined);
      await FileSystem.deleteAsync(vocabPath, { idempotent: true }).catch(() => undefined);
      onProgress?.({
        status: "failed",
        progress: 0,
        downloadedBytes: 0,
        totalBytes: null,
        phase: "onnx",
        error: error instanceof Error ? error.message : "Embedding download failed",
      });
      throw error;
    }
  }

  async cancel() {
    await this.activeOnnx?.cancelAsync().catch(() => undefined);
    await this.activeVocab?.cancelAsync().catch(() => undefined);
    this.activeOnnx = null;
    this.activeVocab = null;
  }

  async remove() {
    const onnxPath = await EmbeddingService.getOnnxPath();
    const vocabPath = await EmbeddingService.getVocabPath();
    await EmbeddingService.unload();
    await FileSystem.deleteAsync(onnxPath, { idempotent: true }).catch(() => undefined);
    await FileSystem.deleteAsync(vocabPath, { idempotent: true }).catch(() => undefined);
  }
}

export const EmbeddingDownloadService = new DownloadService();
