import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { benchmarkRepository } from "../../repositories/benchmarkRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { settingsRepository } from "../../repositories/settingsRepository";
import { BenchmarkRun, Message } from "../../types";
import { nowIso } from "../../utils/dates";
import { createId } from "../../utils/errors";
import { LlamaService } from "../llm/LlamaService";
import { estimateTokens } from "../llm/tokenEstimate";
import { toStrategy } from "../rag/chunkText";
import { buildRagPrompt } from "../rag/ragPrompt";
import { retrieveChunks } from "../rag/retrieval";

const testPrompt = "Explain quantization in large language models in simple terms.";

export const BenchmarkService = {
  async runChatPrompt() {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select a model before running a benchmark.");
    const messages: Pick<Message, "role" | "content">[] = [{ role: "user", content: testPrompt }];
    const started = Date.now();
    const result = await LlamaService.generateWithCurrentSettings(messages);
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
      createdAt: nowIso()
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
      const selected = retrieveChunks(testPrompt, chunks, { topK: settings.ragTopK });
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

  async exportJson() {
    const runs = await benchmarkRepository.listRuns();
    const path = `${FileSystem.documentDirectory}pocketai-benchmarks-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(runs, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
  }
};
