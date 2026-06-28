import { Message } from "../../types";
import { settingsRepository } from "../../repositories/settingsRepository";
import { EmbeddingService } from "../embeddings/EmbeddingService";
import { DEFAULT_SYSTEM_PROMPT } from "../llm/promptTemplates";
import { formatSelectedAsContext, prioritize } from "./prioritizer";
import { gatherCandidates, GatherOptions } from "./sources";
import { ContextItem, PrioritizationResult, PrioritizationStrategy, ScoringWeights } from "./types";

export interface BuildPromptOptions {
  query: string;
  recentMessages: Pick<Message, "role" | "content">[];
  conversationId?: string | null;
  documentId?: string | null;
  systemPrompt?: string;
  strategy?: PrioritizationStrategy;
  weights?: ScoringWeights;
  contextTokenBudget?: number;
  includeChat?: boolean;
  includeDocument?: boolean;
  includeCalendar?: boolean;
  includeHealth?: boolean;
  externalCandidates?: ContextItem[];
  forceNeuralEmbeddings?: boolean;
}

export interface BuildPromptResult {
  systemPromptWithContext: string;
  messages: Pick<Message, "role" | "content">[];
  prioritization: PrioritizationResult;
  candidatesConsidered: number;
  embeddingPath: "neural" | "tfidf";
  embeddingTimeMs: number;
}

const DEFAULT_CONTEXT_BUDGET_RATIO = 0.5;

const tryEmbedAll = async (query: string, items: ContextItem[]): Promise<{ queryEmbedding?: Float32Array; embedded: ContextItem[]; elapsedMs: number; path: "neural" | "tfidf" }> => {
  const start = Date.now();
  try {
    if (!(await EmbeddingService.modelExists())) {
      return { embedded: items, elapsedMs: Date.now() - start, path: "tfidf" };
    }
    await EmbeddingService.load();
    const queryEmbedding = await EmbeddingService.embed(query);
    const embedded: ContextItem[] = [];
    for (const item of items) {
      if (item.embedding) {
        embedded.push(item);
      } else {
        const vec = await EmbeddingService.embed(item.text);
        embedded.push({ ...item, embedding: vec });
      }
    }
    return { queryEmbedding, embedded, elapsedMs: Date.now() - start, path: "neural" };
  } catch {
    return { embedded: items, elapsedMs: Date.now() - start, path: "tfidf" };
  }
};

export const buildPrioritizedPrompt = async (options: BuildPromptOptions): Promise<BuildPromptResult> => {
  const settings = await settingsRepository.getSettings();
  const gatherOptions: GatherOptions = {
    conversationId: options.conversationId ?? null,
    documentId: options.documentId ?? null,
    includeChat: options.includeChat ?? Boolean(options.conversationId),
    includeDocument: options.includeDocument ?? Boolean(options.documentId),
    includeCalendar: options.includeCalendar ?? true,
    includeHealth: options.includeHealth ?? true,
  };
  const gathered = await gatherCandidates(gatherOptions);
  const candidates = options.externalCandidates ? [...gathered, ...options.externalCandidates] : gathered;
  const tokenBudget = options.contextTokenBudget ?? Math.floor(settings.contextSize * DEFAULT_CONTEXT_BUDGET_RATIO);

  const { queryEmbedding, embedded, elapsedMs, path } = await tryEmbedAll(options.query, candidates);

  const prioritization = prioritize({
    query: options.query,
    candidates: embedded,
    tokenBudget,
    strategy: options.strategy ?? "pocketai",
    weights: options.weights,
    queryEmbedding,
  });
  const contextBlock = formatSelectedAsContext(prioritization);
  const baseSystem = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPromptWithContext = contextBlock
    ? `${baseSystem}\n\nUse the following retrieved context when relevant. If the context does not answer the question, say so.\n\n${contextBlock}`
    : baseSystem;
  return {
    systemPromptWithContext,
    messages: options.recentMessages,
    prioritization,
    candidatesConsidered: candidates.length,
    embeddingPath: path,
    embeddingTimeMs: elapsedMs,
  };
};
