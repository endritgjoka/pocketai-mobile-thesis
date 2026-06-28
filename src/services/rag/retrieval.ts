import { DocumentChunk } from "../../types";
import { cosineSimilarityVec, EmbeddingService } from "../embeddings/EmbeddingService";
import { cosineSimilarity, termFrequency } from "./embeddings";

export type RetrievalResult = DocumentChunk & { score: number };

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  chunkEmbeddings?: Map<string, Float32Array>;
}

export const retrieveChunks = async (
  question: string,
  chunks: DocumentChunk[],
  options: RetrievalOptions = {},
): Promise<RetrievalResult[]> => {
  const topK = options.topK ?? 4;
  const threshold = options.similarityThreshold ?? 0.05;

  if (await EmbeddingService.modelExists()) {
    try {
      await EmbeddingService.load();
      const queryEmbedding = await EmbeddingService.embed(question);
      const scored: RetrievalResult[] = [];
      for (const chunk of chunks) {
        const cached = options.chunkEmbeddings?.get(chunk.id) ?? chunk.embedding ?? undefined;
        const chunkEmbedding = cached ?? (await EmbeddingService.embed(chunk.text));
        scored.push({ ...chunk, score: cosineSimilarityVec(queryEmbedding, chunkEmbedding) });
      }
      return scored
        .filter((c) => c.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch {}
  }

  const questionVector = termFrequency(question);
  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(questionVector, termFrequency(chunk.text)) }))
    .filter((chunk) => chunk.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};
