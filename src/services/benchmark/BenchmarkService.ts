import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { MODEL_CATALOG } from "../../config/models";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { modelRepository } from "../../repositories/modelRepository";
import { settingsRepository } from "../../repositories/settingsRepository";
import { BenchmarkRun, Message, ModelId } from "../../types";
import { nowIso } from "../../utils/dates";
import { createId } from "../../utils/errors";
import { EmbeddingService } from "../embeddings/EmbeddingService";
import { LlamaService } from "../llm/LlamaService";
import { estimateTokens } from "../llm/tokenEstimate";
import { ChunkSize, toStrategy } from "../rag/chunkText";
import { buildRagPrompt } from "../rag/ragPrompt";
import { retrieveChunks } from "../rag/retrieval";
import { BatteryService, batteryDeltaPct } from "./BatteryService";
import { computeRouge } from "../eval/rouge";

const testPrompt = "Explain quantization in large language models in simple terms.";
const CHUNK_SIZES: ChunkSize[] = [256, 512, 1024];

export type SweepProgress = { current: number; total: number; modelId: ModelId; chunkSize?: ChunkSize };

// Modelet që janë realisht të shkarkuara në pajisje (ose të gjitha kur përdoret inferenca mock).
const availableModels = async (useMock: boolean): Promise<ModelId[]> => {
  if (useMock) return MODEL_CATALOG.map((m) => m.id);
  const out: ModelId[] = [];
  for (const m of MODEL_CATALOG) {
    if (await LlamaService.hasModel(m.id)) out.push(m.id);
  }
  return out;
};

export const BenchmarkService = {
  async runChatPrompt() {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select a model before running a benchmark.");
    const messages: Pick<Message, "role" | "content">[] = [{ role: "user", content: testPrompt }];
    const batteryStart = await BatteryService.level();
    const started = Date.now();
    const result = await LlamaService.generateWithCurrentSettings(messages);
    const batteryEnd = await BatteryService.level();
    const run: BenchmarkRun = {
      id: createId("bench"),
      taskType: "chat",
      modelId: settings.activeModelId,
      documentId: null,
      chunkStrategy: null,
      topK: null,
      promptText: testPrompt,
      promptTokenEstimate: estimateTokens(testPrompt),
      outputTokenEstimate: result.stats.outputTokens,
      retrievalTimeMs: null,
      generationTimeMs: result.stats.totalTimeMs,
      totalTimeMs: Date.now() - started,
      tokensPerSecond: result.stats.tokensPerSecond,
      selectedChunkIds: null,
      notes: null,
      createdAt: nowIso(),
      batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd)
    };
    await benchmarkRepository.addRun(run);
    return run;
  },

  async runDocumentBenchmarks(documentId: string) {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select a model before running document benchmarks.");
    const doc = await documentRepository.getDocument(documentId);
    if (!doc) throw new Error("Document not found.");
    const runs: BenchmarkRun[] = [];
    for (const chunkSize of [256, 512, 1024] as const) {
      const strategy = toStrategy(chunkSize);
      const chunks = await documentRepository.getChunks(documentId, strategy);
      const retrievalStarted = Date.now();
      const selected = await retrieveChunks(testPrompt, chunks, { topK: settings.ragTopK });
      const retrievalTimeMs = Date.now() - retrievalStarted;
      const promptMessages = buildRagPrompt(doc.title, testPrompt, selected);
      const started = Date.now();
      const result = await LlamaService.generateWithCurrentSettings(promptMessages);
      const promptText = promptMessages[0].content;
      const run: BenchmarkRun = {
        id: createId("bench"),
        taskType: "document_qa",
        modelId: settings.activeModelId,
        documentId,
        chunkStrategy: strategy,
        topK: settings.ragTopK,
        promptText,
        promptTokenEstimate: estimateTokens(promptText),
        outputTokenEstimate: result.stats.outputTokens,
        retrievalTimeMs,
        generationTimeMs: result.stats.totalTimeMs,
        totalTimeMs: Date.now() - started + retrievalTimeMs,
        tokensPerSecond: result.stats.tokensPerSecond,
        selectedChunkIds: JSON.stringify(selected.map((chunk) => chunk.id)),
        notes: null,
        createdAt: nowIso()
      };
      await benchmarkRepository.addRun(run);
      runs.push(run);
    }
    return runs;
  },

  // Sweep CHAT mbi të gjitha modelet e shkarkuara (krahasim model + nivel kuantizimi q4/q8).
  async runModelSweep(onProgress?: (p: SweepProgress) => void) {
    const settings = await settingsRepository.getSettings();
    const models = await availableModels(settings.useMockInference);
    if (models.length === 0) throw new Error("No downloaded models to benchmark. Download at least one model first.");
    const runs: BenchmarkRun[] = [];
    let current = 0;
    for (const modelId of models) {
      onProgress?.({ current: ++current, total: models.length, modelId });
      const batteryStart = await BatteryService.level();
      const started = Date.now();
      const result = await LlamaService.generateChatCompletion({
        modelId, messages: [{ role: "user", content: testPrompt }],
        contextSize: settings.contextSize, temperature: settings.temperature, topP: settings.topP,
        maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
      });
      const batteryEnd = await BatteryService.level();
      const run: BenchmarkRun = {
        id: createId("bench"), taskType: "chat", modelId, documentId: null, chunkStrategy: null, topK: null,
        promptText: testPrompt, promptTokenEstimate: estimateTokens(testPrompt), outputTokenEstimate: result.stats.outputTokens,
        retrievalTimeMs: null, generationTimeMs: result.stats.totalTimeMs, totalTimeMs: Date.now() - started,
        tokensPerSecond: result.stats.tokensPerSecond, selectedChunkIds: null, notes: "sweep:model", createdAt: nowIso(),
        batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd),
      };
      await benchmarkRepository.addRun(run);
      runs.push(run);
    }
    return runs;
  },

  // Sweep i plotë RAG: çdo model i shkarkuar × çdo madhësi cope (matrica e Kapitullit 6).
  async runDocumentSweep(documentId: string, onProgress?: (p: SweepProgress) => void) {
    const settings = await settingsRepository.getSettings();
    const doc = await documentRepository.getDocument(documentId);
    if (!doc) throw new Error("Document not found.");
    const models = await availableModels(settings.useMockInference);
    if (models.length === 0) throw new Error("No downloaded models to benchmark. Download at least one model first.");
    const runs: BenchmarkRun[] = [];
    const total = models.length * CHUNK_SIZES.length;
    let current = 0;
    for (const modelId of models) {
      for (const chunkSize of CHUNK_SIZES) {
        onProgress?.({ current: ++current, total, modelId, chunkSize });
        const strategy = toStrategy(chunkSize);
        const chunks = await documentRepository.getChunks(documentId, strategy);
        const retrievalStarted = Date.now();
        const selected = await retrieveChunks(testPrompt, chunks, { topK: settings.ragTopK });
        const retrievalTimeMs = Date.now() - retrievalStarted;
        const promptMessages = buildRagPrompt(doc.title, testPrompt, selected);
        const batteryStart = await BatteryService.level();
        const started = Date.now();
        const result = await LlamaService.generateChatCompletion({
          modelId, messages: promptMessages, contextSize: settings.contextSize, temperature: settings.temperature,
          topP: settings.topP, maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
        });
        const batteryEnd = await BatteryService.level();
        const promptText = promptMessages[0].content;
        const run: BenchmarkRun = {
          id: createId("bench"), taskType: "document_qa", modelId, documentId, chunkStrategy: strategy, topK: settings.ragTopK,
          promptText, promptTokenEstimate: estimateTokens(promptText), outputTokenEstimate: result.stats.outputTokens,
          retrievalTimeMs, generationTimeMs: result.stats.totalTimeMs, totalTimeMs: Date.now() - started + retrievalTimeMs,
          tokensPerSecond: result.stats.tokensPerSecond, selectedChunkIds: JSON.stringify(selected.map((c) => c.id)),
          notes: `sweep:rag embed=${(await EmbeddingService.modelExists()) ? "neural" : "tfidf"}`, createdAt: nowIso(),
          batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd),
        };
        await benchmarkRepository.addRun(run);
        runs.push(run);
      }
    }
    return runs;
  },

  // Përmbledh dokumentin me modelin aktiv dhe llogarit ROUGE përkundër një përmbledhjeje referencë.
  async runSummaryEval(documentId: string, referenceSummary: string) {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select a model before running the summary evaluation.");
    const doc = await documentRepository.getDocument(documentId);
    if (!doc) throw new Error("Document not found.");
    const source = doc.text.slice(0, 4000);
    const messages: Pick<Message, "role" | "content">[] = [
      { role: "user", content: `Summarize the following document in a few sentences.\n\nDocument:\n${source}` },
    ];
    const batteryStart = await BatteryService.level();
    const started = Date.now();
    const result = await LlamaService.generateChatCompletion({
      modelId: settings.activeModelId, messages, contextSize: settings.contextSize, temperature: settings.temperature,
      topP: settings.topP, maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
    });
    const batteryEnd = await BatteryService.level();
    const rouge = computeRouge(result.text, referenceSummary);
    const run: BenchmarkRun = {
      id: createId("bench"), taskType: "summary", modelId: settings.activeModelId, documentId, chunkStrategy: null, topK: null,
      promptText: messages[0].content, promptTokenEstimate: estimateTokens(messages[0].content), outputTokenEstimate: result.stats.outputTokens,
      retrievalTimeMs: null, generationTimeMs: result.stats.totalTimeMs, totalTimeMs: Date.now() - started,
      tokensPerSecond: result.stats.tokensPerSecond, selectedChunkIds: null,
      notes: `summary R1=${rouge.rouge1.toFixed(3)} R2=${rouge.rouge2.toFixed(3)} RL=${rouge.rougeL.toFixed(3)}`, createdAt: nowIso(),
      batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd),
      rouge1: rouge.rouge1, rouge2: rouge.rouge2, rougeL: rouge.rougeL,
    };
    await benchmarkRepository.addRun(run);
    return { run, summary: result.text, rouge };
  },

  async exportJson() {
    const runs = await benchmarkRepository.listRuns();
    const path = `${FileSystem.documentDirectory}pocketai-benchmarks-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(runs, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
  },

  async exportCsv() {
    const runs = await benchmarkRepository.listRuns();
    const cols: (keyof BenchmarkRun)[] = [
      "createdAt", "taskType", "modelId", "documentId", "chunkStrategy", "topK",
      "promptTokenEstimate", "outputTokenEstimate", "retrievalTimeMs", "generationTimeMs", "totalTimeMs", "tokensPerSecond",
      "batteryStart", "batteryEnd", "batteryDelta", "rouge1", "rouge2", "rougeL", "notes",
    ];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(","), ...runs.map((r) => cols.map((c) => esc(r[c])).join(","))];
    const path = `${FileSystem.documentDirectory}pocketai-benchmarks-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, lines.join("\n"));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
  }
};
