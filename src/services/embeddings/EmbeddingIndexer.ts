import { documentRepository } from "../../repositories/documentRepository";
import { EMBEDDING_MODEL } from "./embeddingCatalog";
import { EmbeddingService } from "./EmbeddingService";

export interface IndexProgress {
  total: number;
  completed: number;
  chunkId: string;
}

export const EmbeddingIndexer = {
  async indexDocument(documentId: string, onProgress?: (progress: IndexProgress) => void) {
    if (!(await EmbeddingService.modelExists())) return { skipped: true, indexed: 0 };
    await EmbeddingService.load();
    const chunks = await documentRepository.getChunks(documentId);
    const pending = chunks.filter((c) => !c.embedding || c.embeddingModel !== EMBEDDING_MODEL.id);
    for (let i = 0; i < pending.length; i += 1) {
      const chunk = pending[i];
      const vec = await EmbeddingService.embed(chunk.text);
      await documentRepository.updateChunkEmbedding(chunk.id, vec, EMBEDDING_MODEL.id);
      onProgress?.({ total: pending.length, completed: i + 1, chunkId: chunk.id });
    }
    return { skipped: false, indexed: pending.length };
  },

  async indexAll(onProgress?: (docId: string, progress: IndexProgress) => void) {
    if (!(await EmbeddingService.modelExists())) return { skipped: true, indexed: 0 };
    const docs = await documentRepository.listDocuments();
    let totalIndexed = 0;
    for (const doc of docs) {
      const result = await this.indexDocument(doc.id, (p) => onProgress?.(doc.id, p));
      totalIndexed += result.indexed;
    }
    return { skipped: false, indexed: totalIndexed };
  },
};
