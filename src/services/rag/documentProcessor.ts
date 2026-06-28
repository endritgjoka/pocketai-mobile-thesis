import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { documentRepository } from "../../repositories/documentRepository";
import { ChunkSize, chunkText, toStrategy } from "./chunkText";
import { DocumentRecord } from "../../types";
import { createId } from "../../utils/errors";
import { nowIso } from "../../utils/dates";
import { EmbeddingIndexer } from "../embeddings/EmbeddingIndexer";
import { extractText } from "./textExtraction";

const documentsDir = `${FileSystem.documentDirectory ?? ""}documents/`;

const ensureDocumentsDir = async () => {
  const info = await FileSystem.getInfoAsync(documentsDir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
};

const extensionFor = (name: string) => name.split(".").pop()?.toLowerCase() ?? "txt";

export const documentProcessor = {
  async pickAndImport(chunkSize: ChunkSize) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true
    });
    if (result.canceled) return null;
    return this.importAsset(result.assets[0], chunkSize);
  },

  async importAsset(asset: DocumentPicker.DocumentPickerAsset, chunkSize: ChunkSize) {
    await ensureDocumentsDir();
    const id = createId("doc");
    const fileType = extensionFor(asset.name);
    const localPath = `${documentsDir}${id}-${asset.name}`;
    await FileSystem.copyAsync({ from: asset.uri, to: localPath });
    const now = nowIso();
    const extraction = await extractText(localPath, fileType);
    const text = extraction.ok && extraction.text.trim()
      ? extraction.text
      : `Nuk u arrit të nxirret tekst nga "${asset.name}". Për PDF të skanuar ose me fonte të veçanta, nxjerrja mund të dështojë.`;
    const status: DocumentRecord["status"] = extraction.ok && extraction.text.trim() ? "ready" : "failed";

    const activeChunks = chunkText(id, text, chunkSize);
    const allChunks = ([256, 512, 1024] as const).flatMap((size) => chunkText(id, text, size));
    const doc: DocumentRecord = {
      id,
      title: asset.name.replace(/\.[^.]+$/, ""),
      filename: asset.name,
      fileType,
      localPath,
      status,
      text,
      characterCount: text.length,
      chunkCount: activeChunks.length,
      chunkStrategy: toStrategy(chunkSize),
      createdAt: now,
      updatedAt: now
    };
    await documentRepository.upsertDocument(doc);
    await documentRepository.replaceChunks(id, allChunks);
    await EmbeddingIndexer.indexDocument(id).catch(() => undefined);
    return doc;
  }
};
