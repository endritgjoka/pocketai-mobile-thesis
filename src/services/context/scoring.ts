import { cosineSimilarityVec } from "../embeddings/EmbeddingService";
import { cosineSimilarity, termFrequency } from "../rag/embeddings";
import { ContextItem, ScoringWeights } from "./types";

export const computeRelevance = (
  query: string,
  item: ContextItem,
  queryEmbedding?: Float32Array,
) => {
  if (queryEmbedding && item.embedding) {
    return cosineSimilarityVec(queryEmbedding, item.embedding);
  }
  return cosineSimilarity(termFrequency(query), termFrequency(item.text));
};

export const computeRecency = (
  timestamp: string,
  nowMs: number,
  halfLifeHours: number,
  floor = 0,
) => {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return floor;
  const ageHours = Math.max(0, (nowMs - t) / 3_600_000);
  const decayed = Math.exp((-Math.LN2 * ageHours) / Math.max(1, halfLifeHours));
  // Kufiri ruan një peshë minimale për informacionin e vjetër që nuk është zëvendësuar.
  return Math.max(floor, decayed);
};

export const computeScore = (
  item: ContextItem,
  query: string,
  weights: ScoringWeights,
  nowMs: number,
  queryEmbedding?: Float32Array,
) => {
  const relevance = computeRelevance(query, item, queryEmbedding);
  const recency = computeRecency(item.timestamp, nowMs, weights.recencyHalfLifeHours, weights.recencyFloor ?? 0);
  const sourceWeight = weights.sourceWeights[item.source] ?? 0.5;
  const score = relevance * recency * sourceWeight;
  return { relevance, recency, sourceWeight, score };
};
