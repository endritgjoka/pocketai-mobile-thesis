import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { documentRepository } from "../../repositories/documentRepository";
import { ChunkSize, chunkText, toStrategy } from "./chunkText";
import { DocumentRecord } from "../../types";
import { createId } from "../../utils/errors";
import { nowIso } from "../../utils/dates";

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
    let text = "";
    let status: DocumentRecord["status"] = "ready";
    if (fileType === "txt") {
      text = await FileSystem.readAsStringAsync(localPath);
    } else {
      text = `Text extraction placeholder for ${asset.name}. TXT files are fully supported in this prototype. PDF/DOCX extraction should be connected to a native extraction module before running formal RAG experiments on this file type.`;
      status = "imported";
    }

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
    return doc;
  }
};
