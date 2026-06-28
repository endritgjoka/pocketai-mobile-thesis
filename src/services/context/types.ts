export type ContextSourceKind = "chat" | "document" | "calendar" | "health";

export type PrioritizationStrategy = "pocketai" | "truncation" | "recency" | "relevance";

export interface ContextItem {
  id: string;
  source: ContextSourceKind;
  text: string;
  tokenCount: number;
  timestamp: string;
  embedding?: Float32Array;
  meta?: Record<string, unknown>;
}

export interface ScoringWeights {
  sourceWeights: Record<ContextSourceKind, number>;
  recencyHalfLifeHours: number;
}

export interface ScoredItem extends ContextItem {
  relevance: number;
  recency: number;
  sourceWeight: number;
  score: number;
}

export interface PrioritizationResult {
  strategy: PrioritizationStrategy;
  selected: ScoredItem[];
  rejected: Array<ScoredItem & { reason: "low_score" | "budget_exhausted" }>;
  tokenBudget: number;
  tokensUsed: number;
  scoringTimeMs: number;
  packingTimeMs: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  sourceWeights: { document: 1.0, chat: 0.8, calendar: 0.6, health: 0.4 },
  recencyHalfLifeHours: 24 * 7,
};
