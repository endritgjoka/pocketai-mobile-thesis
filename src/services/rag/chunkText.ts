import { DocumentChunk } from "../../types";
import { nowIso } from "../../utils/dates";
import { createId } from "../../utils/errors";
import { estimateTokens } from "../llm/tokenEstimate";

export type ChunkSize = 256 | 512 | 1024;
export type ChunkStrategy = "fixed_256" | "fixed_512" | "fixed_1024";

export const toStrategy = (chunkSize: ChunkSize): ChunkStrategy => `fixed_${chunkSize}` as ChunkStrategy;

export const chunkText = (documentId: string, text: string, chunkSize: ChunkSize): DocumentChunk[] => {
  const strategy = toStrategy(chunkSize);
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const approxWordsPerChunk = Math.max(1, Math.floor(chunkSize * 0.75));
  const chunks: DocumentChunk[] = [];
  for (let start = 0; start < words.length; start += approxWordsPerChunk) {
    const chunkWords = words.slice(start, start + approxWordsPerChunk);
    const chunk = chunkWords.join(" ");
    chunks.push({
      id: createId("chunk"),
      documentId,
      chunkIndex: chunks.length + 1,
      text: chunk,
      tokenCount: estimateTokens(chunk),
      strategy,
      createdAt: nowIso()
    });
  }
  return chunks;
};
