/**
 * Ndihmës vetëm për zhvillim.
 *
 * Ekspozon shërbimet e matjes te `global.PocketAI`, që eksperimentet të mund të nisen
 * edhe nga debuggeri (Hermes inspector) pa kaluar nëpër ndërfaqe. Kjo është e dobishme
 * për të verifikuar matjet dhe për t'i përsëritur ato në mënyrë të njëjtë.
 *
 * Importohet vetëm nën `__DEV__`, prandaj nuk përfshihet në ndërtimet e prodhimit.
 */
import { BenchmarkService } from "../services/benchmark/BenchmarkService";
import { MemoryService, bytesToMb, memoryMetricName } from "../services/benchmark/MemoryService";
import { benchmarkRepository } from "../repositories/benchmarkRepository";
import { retrievalEvalRepository } from "../repositories/retrievalEvalRepository";
import { documentRepository } from "../repositories/documentRepository";
import { LlamaService } from "../services/llm/LlamaService";
import { ModelFileService } from "../services/models/ModelFileService";
import { evaluateRetrieval, averageRetrievalMetrics } from "../services/eval/retrievalEval";
import { aggregateRuns } from "../services/benchmark/aggregate";
import { CHAT_PROMPTS, DOC_PROMPTS, QUICK_CHAT_PROMPTS } from "../services/benchmark/prompts";
import { queryAll, queryFirst } from "../db/database";
import { ModelDownloadService } from "../services/models/ModelDownloadService";
import { documentProcessor } from "../services/rag/documentProcessor";
import * as FileSystem from "expo-file-system";
import * as Battery from "expo-battery";
import { EmbeddingService } from "../services/embeddings/EmbeddingService";
import { EmbeddingDownloadService } from "../services/embeddings/EmbeddingDownloadService";
import { EmbeddingIndexer } from "../services/embeddings/EmbeddingIndexer";
import { retrieveChunks } from "../services/rag/retrieval";
import { buildRagPrompt } from "../services/rag/ragPrompt";
import { toStrategy } from "../services/rag/chunkText";
import { evaluatePrioritization, PRIORITIZATION_STRATEGIES } from "../services/eval/prioritizationEval";

(globalThis as unknown as { PocketAI: unknown }).PocketAI = {
  BenchmarkService,
  MemoryService,
  benchmarkRepository,
  retrievalEvalRepository,
  documentRepository,
  LlamaService,
  ModelFileService,
  evaluateRetrieval,
  averageRetrievalMetrics,
  aggregateRuns,
  prompts: { CHAT_PROMPTS, DOC_PROMPTS, QUICK_CHAT_PROMPTS },
  bytesToMb,
  memoryMetricName,
  db: { queryAll, queryFirst },
  ModelDownloadService,
  documentProcessor,
  FileSystem,
  Battery,
  EmbeddingService,
  EmbeddingDownloadService,
  EmbeddingIndexer,
  retrieveChunks,
  buildRagPrompt,
  toStrategy,
  evaluatePrioritization,
  PRIORITIZATION_STRATEGIES,
};
