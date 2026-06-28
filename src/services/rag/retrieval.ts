import { DocumentChunk } from "../../types";
import { cosineSimilarityVec, EmbeddingService } from "../embeddings/EmbeddingService";
import { cosineSimilarity, termFrequency } from "./embeddings";

export type RetrievalResult = DocumentChunk & { score: number };

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  chunkEmbeddings?: Map<string, Float32Array>;
}

// Zgjedh top-K sipas rezultatit. Nëse asnjë copë nuk e kalon pragun, kthen prapë më të mirat
// (që konteksti të mos jetë bosh për pyetje që nuk përputhen leksikisht me tekstin).
const rankTopK = (scored: RetrievalResult[], topK: number, threshold: number): RetrievalResult[] => {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const aboveThreshold = sorted.filter((c) => c.score >= threshold);
  const chosen = aboveThreshold.length > 0 ? aboveThreshold : sorted;
  return chosen.slice(0, topK);
};

export const retrieveChunks = async (
  question: string,
  chunks: DocumentChunk[],
  options: RetrievalOptions = {},
): Promise<RetrievalResult[]> => {
  const topK = options.topK ?? 4;
  const threshold = options.similarityThreshold ?? 0.05;
  if (chunks.length === 0) return [];

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
      return rankTopK(scored, topK, threshold);
    } catch {}
  }

  const questionVector = termFrequency(question);
  const scored = chunks.map((chunk) => ({ ...chunk, score: cosineSimilarity(questionVector, termFrequency(chunk.text)) }));
  return rankTopK(scored, topK, threshold);
};
