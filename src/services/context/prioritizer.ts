import { computeScore } from "./scoring";
import {
  ContextItem,
  DEFAULT_WEIGHTS,
  PrioritizationResult,
  PrioritizationStrategy,
  ScoredItem,
  ScoringWeights,
} from "./types";

export interface PrioritizeOptions {
  query: string;
  candidates: ContextItem[];
  tokenBudget: number;
  strategy?: PrioritizationStrategy;
  weights?: ScoringWeights;
  minScore?: number;
  now?: number;
  queryEmbedding?: Float32Array;
}

const scoreAll = (items: ContextItem[], query: string, weights: ScoringWeights, nowMs: number, queryEmbedding?: Float32Array): ScoredItem[] =>
  items.map((item) => ({ ...item, ...computeScore(item, query, weights, nowMs, queryEmbedding) }));

const packGreedy = (
  scored: ScoredItem[],
  tokenBudget: number,
  minScore: number,
): { selected: ScoredItem[]; rejected: PrioritizationResult["rejected"]; tokensUsed: number } => {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const selected: ScoredItem[] = [];
  const rejected: PrioritizationResult["rejected"] = [];
  let tokensUsed = 0;
  for (const item of sorted) {
    if (item.score < minScore) {
      rejected.push({ ...item, reason: "low_score" });
      continue;
    }
    if (tokensUsed + item.tokenCount > tokenBudget) {
      rejected.push({ ...item, reason: "budget_exhausted" });
      continue;
    }
    selected.push(item);
    tokensUsed += item.tokenCount;
  }
  return { selected, rejected, tokensUsed };
};

const runPocketAI = (opts: Required<Pick<PrioritizeOptions, "query" | "candidates" | "tokenBudget">> & { weights: ScoringWeights; minScore: number; now: number; queryEmbedding?: Float32Array }): PrioritizationResult => {
  const scoringStart = Date.now();
  const scored = scoreAll(opts.candidates, opts.query, opts.weights, opts.now, opts.queryEmbedding);
  const scoringTimeMs = Date.now() - scoringStart;
  const packingStart = Date.now();
  const { selected, rejected, tokensUsed } = packGreedy(scored, opts.tokenBudget, opts.minScore);
  return {
    strategy: "pocketai",
    selected,
    rejected,
    tokenBudget: opts.tokenBudget,
    tokensUsed,
    scoringTimeMs,
    packingTimeMs: Date.now() - packingStart,
  };
};

const runTruncation = (opts: { candidates: ContextItem[]; tokenBudget: number }): PrioritizationResult => {
  const start = Date.now();
  const scored: ScoredItem[] = opts.candidates.map((c) => ({ ...c, relevance: 0, recency: 0, sourceWeight: 1, score: 1 }));
  const selected: ScoredItem[] = [];
  const rejected: PrioritizationResult["rejected"] = [];
  let tokensUsed = 0;
  for (const item of scored) {
    if (tokensUsed + item.tokenCount > opts.tokenBudget) {
      rejected.push({ ...item, reason: "budget_exhausted" });
      continue;
    }
    selected.push(item);
    tokensUsed += item.tokenCount;
  }
  return { strategy: "truncation", selected, rejected, tokenBudget: opts.tokenBudget, tokensUsed, scoringTimeMs: 0, packingTimeMs: Date.now() - start };
};

const runRecency = (opts: { candidates: ContextItem[]; tokenBudget: number; weights: ScoringWeights; now: number }): PrioritizationResult => {
  const scoringStart = Date.now();
  const scored: ScoredItem[] = opts.candidates.map((c) => {
    const { recency } = computeScore(c, "", opts.weights, opts.now);
    return { ...c, relevance: 0, recency, sourceWeight: 1, score: recency };
  });
  const scoringTimeMs = Date.now() - scoringStart;
  const packingStart = Date.now();
  const { selected, rejected, tokensUsed } = packGreedy(scored, opts.tokenBudget, 0);
  return { strategy: "recency", selected, rejected, tokenBudget: opts.tokenBudget, tokensUsed, scoringTimeMs, packingTimeMs: Date.now() - packingStart };
};

const runRelevance = (opts: { query: string; candidates: ContextItem[]; tokenBudget: number; weights: ScoringWeights; now: number; queryEmbedding?: Float32Array }): PrioritizationResult => {
  const scoringStart = Date.now();
  const scored: ScoredItem[] = opts.candidates.map((c) => {
    const { relevance } = computeScore(c, opts.query, opts.weights, opts.now, opts.queryEmbedding);
    return { ...c, relevance, recency: 0, sourceWeight: 1, score: relevance };
  });
  const scoringTimeMs = Date.now() - scoringStart;
  const packingStart = Date.now();
  const { selected, rejected, tokensUsed } = packGreedy(scored, opts.tokenBudget, 0);
  return { strategy: "relevance", selected, rejected, tokenBudget: opts.tokenBudget, tokensUsed, scoringTimeMs, packingTimeMs: Date.now() - packingStart };
};

export const prioritize = (options: PrioritizeOptions): PrioritizationResult => {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const minScore = options.minScore ?? 0;
  const now = options.now ?? Date.now();
  const strategy: PrioritizationStrategy = options.strategy ?? "pocketai";
  switch (strategy) {
    case "truncation":
      return runTruncation({ candidates: options.candidates, tokenBudget: options.tokenBudget });
    case "recency":
      return runRecency({ candidates: options.candidates, tokenBudget: options.tokenBudget, weights, now });
    case "relevance":
      return runRelevance({ query: options.query, candidates: options.candidates, tokenBudget: options.tokenBudget, weights, now, queryEmbedding: options.queryEmbedding });
    case "pocketai":
    default:
      return runPocketAI({ query: options.query, candidates: options.candidates, tokenBudget: options.tokenBudget, weights, minScore, now, queryEmbedding: options.queryEmbedding });
  }
};

export const formatSelectedAsContext = (result: PrioritizationResult): string => {
  if (result.selected.length === 0) return "";
  const groups: Record<string, ScoredItem[]> = {};
  for (const item of result.selected) {
    (groups[item.source] = groups[item.source] || []).push(item);
  }
  const sectionLabels: Record<string, string> = {
    document: "Document context",
    chat: "Earlier conversation",
    calendar: "Upcoming events",
    health: "Recent health data",
  };
  return Object.entries(groups)
    .map(([source, items]) => `[${sectionLabels[source] ?? source}]\n${items.map((i) => i.text).join("\n")}`)
    .join("\n\n");
};
