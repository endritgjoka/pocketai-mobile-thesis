import { PermissionStatus } from "./permissions";

export type ModelId = "phi3-mini-q4" | "llama32-3b-q4" | "llama32-1b-q4" | "llama32-1b-q8" | "llama32-3b-q8";

export interface ModelCatalogItem {
  id: ModelId;
  name: string;
  modeLabel: string;
  filename: string;
  url: string;
  sizeLabel: string;
  recommendedRam: string;
  description: string;
  defaultContextSize: number;
}

export interface LocalModel {
  id: string;
  filename: string;
  localPath: string;
  downloaded: boolean;
  downloadedAt: string | null;
  sizeBytes: number | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sortOrder: number | null;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  activeModelId: ModelId | null;
  contextSize: 1024 | 2048 | 4096;
  temperature: number;
  topP: number;
  maxTokens: number;
  ragChunkSize: 256 | 512 | 1024;
  ragTopK: 2 | 4 | 6 | 8;
  contextPrioritizationEnabled: boolean;
  prioritizationStrategy: "pocketai" | "truncation" | "recency" | "relevance";
  useMockInference: boolean;
  notificationsEnabled: boolean;
  morningBriefingEnabled: boolean;
  documentReviewEnabled: boolean;
  benchmarkReminderEnabled: boolean;
  notificationPermissionStatus: PermissionStatus;
  calendarMeetingRemindersEnabled: boolean;
  calendarReminderMinutesBefore: 10 | 15 | 30 | 60;
  morningBriefingTime: string;
  documentReviewTime: string;
  benchmarkReminderTime: string;
}

export interface Conversation {
  id: string;
  threadId: string | null;
  folderId: string | null;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
}

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number | null;
  createdAt: string;
  stats?: InferenceStats | null;
}

export interface InferenceStats {
  totalTimeMs: number;
  loadTimeMs?: number | null;
  promptTokens: number;
  outputTokens: number;
  tokensPerSecond: number | null;
  contextSize: number;
  temperature: number;
  topP: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  localPath: string;
  status: "imported" | "extracting" | "chunked" | "indexed" | "ready" | "failed";
  text: string;
  characterCount: number;
  chunkCount: number;
  chunkStrategy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  strategy: "fixed_256" | "fixed_512" | "fixed_1024";
  createdAt: string;
  embedding?: Float32Array | null;
  embeddingModel?: string | null;
}

export interface BenchmarkRun {
  id: string;
  taskType: "chat" | "document_qa" | "summary";
  modelId: string;
  documentId: string | null;
  chunkStrategy: string | null;
  topK: number | null;
  promptText: string;
  promptTokenEstimate: number;
  outputTokenEstimate: number;
  retrievalTimeMs: number | null;
  generationTimeMs: number;
  totalTimeMs: number;
  tokensPerSecond: number | null;
  selectedChunkIds: string | null;
  notes: string | null;
  createdAt: string;
  batteryStart?: number | null;
  batteryEnd?: number | null;
  batteryDelta?: number | null;
  rouge1?: number | null;
  rouge2?: number | null;
  rougeL?: number | null;
}
