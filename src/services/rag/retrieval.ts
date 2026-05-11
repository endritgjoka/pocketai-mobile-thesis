import { DocumentChunk } from "../../types";
import { cosineSimilarity, termFrequency } from "./embeddings";

export type RetrievalResult = DocumentChunk & { score: number };

export const retrieveChunks = (
  question: string,
  chunks: DocumentChunk[],
  options: { topK?: number; similarityThreshold?: number } = {}
): RetrievalResult[] => {
  const questionVector = termFrequency(question);
  const topK = options.topK ?? 4;
  const threshold = options.similarityThreshold ?? 0.05;
  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(questionVector, termFrequency(chunk.text)) }))
    .filter((chunk) => chunk.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};
