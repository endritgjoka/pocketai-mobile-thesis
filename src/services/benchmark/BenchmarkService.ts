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
import { MemoryService, memoryDelta, memoryMetricName, bytesToMb } from "./MemoryService";
import { computeRouge } from "../eval/rouge";
import { BenchPrompt, CHAT_PROMPTS, DOC_PROMPTS, DEFAULT_REPEATS } from "./prompts";
import { aggregateRuns, AggregateRow } from "./aggregate";
import { retrievalEvalRepository } from "../../repositories/retrievalEvalRepository";
import { RetrievalEvalRun } from "../../types";
import { evaluateRetrieval, averageRetrievalMetrics, RetrievalGroundTruth } from "../eval/retrievalEval";

const testPrompt = "Explain quantization in large language models in simple terms.";
const CHUNK_SIZES: ChunkSize[] = [256, 512, 1024];

export type SweepProgress = {
  current: number; total: number; modelId: ModelId;
  chunkSize?: ChunkSize; promptId?: string; repeat?: number;
};

// Modelet që janë realisht të shkarkuara në pajisje (ose të gjitha kur përdoret inferenca mock).
const availableModels = async (useMock: boolean): Promise<ModelId[]> => {
  if (useMock) return MODEL_CATALOG.map((m) => m.id);
  const out: ModelId[] = [];
  for (const m of MODEL_CATALOG) {
    if (await LlamaService.hasModel(m.id)) out.push(m.id);
  }
  return out;
};

// Fushat e memories që shoqërojnë çdo matje (P2).
type MemoryFields = Pick<
  BenchmarkRun,
  | "memoryBaselineBytes" | "memoryAfterLoadBytes" | "memoryModelBytes"
  | "memoryPeakBytes" | "memoryDeltaBytes" | "deviceTotalMemoryBytes" | "memoryMetric"
>;

const EMPTY_MEMORY: MemoryFields = {
  memoryBaselineBytes: null, memoryAfterLoadBytes: null, memoryModelBytes: null,
  memoryPeakBytes: null, memoryDeltaBytes: null, deviceTotalMemoryBytes: null, memoryMetric: null,
};

// Pauzë e shkurtër që i jep sistemit kohë të lirojë faqet e modelit të mëparshëm para matjes bazë.
const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

type ModelLoadMeasurement = {
  baselineBytes: number | null;
  afterLoadBytes: number | null;
  modelBytes: number | null;
  deviceTotalBytes: number | null;
  loadTimeMs: number | null;
};

const EMPTY_LOAD: ModelLoadMeasurement = {
  baselineBytes: null, afterLoadBytes: null, modelBytes: null, deviceTotalBytes: null, loadTimeMs: null,
};

/**
 * Izolon modelin dhe mat gjurmën e tij në memorie.
 *
 * Modeli shkarkohet nga memoria dhe ringarkohet, që diferenca të shprehë vetëm modelin e
 * kuantizuar dhe jo memorien bazë të aplikacionit. Kryhet një herë për model, jo për çdo
 * pyetje, sepse ringarkimi i një skedari disa gigabajtësh për çdo matje do ta zgjaste
 * eksperimentin pa i shtuar asgjë saktësisë.
 */
const measureModelLoad = async (
  modelId: ModelId,
  contextSize: number,
  isolate: boolean
): Promise<ModelLoadMeasurement> => {
  if (!isolate || !MemoryService.isAvailable()) return { ...EMPTY_LOAD };

  await LlamaService.unload();
  await settle();
  const baselineBytes = await MemoryService.usedBytes();
  const started = Date.now();
  await LlamaService.loadModel(modelId, contextSize);
  const loadTimeMs = Date.now() - started;
  const sample = await MemoryService.sample();
  const afterLoadBytes = sample?.usedBytes ?? null;

  return {
    baselineBytes,
    afterLoadBytes,
    modelBytes: memoryDelta(baselineBytes, afterLoadBytes),
    deviceTotalBytes: sample?.deviceTotalBytes ?? null,
    loadTimeMs,
  };
};

// Ndjek kulmin e memories gjatë një gjenerimi të vetëm. Kulmi përfshin edhe cache-in KV.
const measurePeak = async <T>(generate: () => Promise<T>): Promise<{ result: T; peakBytes: number | null }> => {
  if (!MemoryService.isAvailable()) return { result: await generate(), peakBytes: null };
  const tracker = MemoryService.startPeakTracker();
  try {
    const result = await generate();
    const { peakBytes } = await tracker.stop();
    return { result, peakBytes };
  } catch (error) {
    await tracker.stop();
    throw error;
  }
};

// Bashkon matjen e modelit me kulmin e një ekzekutimi në fushat që ruhen për çdo rresht.
const memoryFieldsFor = (load: ModelLoadMeasurement, peakBytes: number | null): MemoryFields => {
  const peak = [peakBytes, load.afterLoadBytes, load.baselineBytes].reduce<number | null>(
    (acc, v) => (v === null ? acc : acc === null ? v : Math.max(acc, v)),
    null
  );
  return {
    memoryBaselineBytes: load.baselineBytes,
    memoryAfterLoadBytes: load.afterLoadBytes,
    memoryModelBytes: load.modelBytes,
    memoryPeakBytes: peak,
    memoryDeltaBytes: memoryDelta(load.baselineBytes, peak),
    deviceTotalMemoryBytes: load.deviceTotalBytes,
    memoryMetric: MemoryService.isAvailable() ? memoryMetricName() : null,
  };
};

/**
 * Matje e thjeshtë për rrugët që nuk bëjnë sweep: nuk e izolon modelin, por regjistron
 * gjendjen bazë dhe kulmin gjatë gjenerimit.
 */
const withMemory = async <T>(
  generate: () => Promise<T>
): Promise<{ result: T; memory: MemoryFields }> => {
  if (!MemoryService.isAvailable()) return { result: await generate(), memory: { ...EMPTY_MEMORY } };
  const baselineBytes = await MemoryService.usedBytes();
  const { result, peakBytes } = await measurePeak(generate);
  const sample = await MemoryService.sample();
  return {
    result,
    memory: memoryFieldsFor(
      { ...EMPTY_LOAD, baselineBytes, deviceTotalBytes: sample?.deviceTotalBytes ?? null },
      peakBytes
    ),
  };
};

export const BenchmarkService = {
  async runChatPrompt() {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select a model before running a benchmark.");
    const messages: Pick<Message, "role" | "content">[] = [{ role: "user", content: testPrompt }];
    const batteryStart = await BatteryService.level();
    const started = Date.now();
    const { result, memory } = await withMemory(() => LlamaService.generateWithCurrentSettings(messages));
    const batteryEnd = await BatteryService.level();
    const run: BenchmarkRun = {
      ...memory,
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
      const { result, memory } = await withMemory(() => LlamaService.generateWithCurrentSettings(promptMessages));
      const promptText = promptMessages[0].content;
      const run: BenchmarkRun = {
        ...memory,
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

  /**
   * Sweep CHAT mbi të gjitha modelet e shkarkuara.
   *
   * Çdo model matet mbi disa pyetje, secila e përsëritur disa herë, që rezultatet të kenë
   * mesatare dhe devijim standard. Modeli ngarkohet një herë e vetme dhe gjurma e tij në
   * memorie matet në atë çast; kulmi matet veçmas për çdo ekzekutim.
   */
  async runModelSweep(
    onProgress?: (p: SweepProgress) => void,
    options?: { prompts?: BenchPrompt[]; repeats?: number }
  ) {
    const settings = await settingsRepository.getSettings();
    const models = await availableModels(settings.useMockInference);
    if (models.length === 0) throw new Error("No downloaded models to benchmark. Download at least one model first.");
    const prompts = options?.prompts ?? CHAT_PROMPTS;
    const repeats = Math.max(1, options?.repeats ?? DEFAULT_REPEATS);
    const runs: BenchmarkRun[] = [];
    const total = models.length * prompts.length * repeats;
    let current = 0;

    for (const modelId of models) {
      const load = await measureModelLoad(modelId, settings.contextSize, !settings.useMockInference);
      let firstOfModel = true;
      for (const prompt of prompts) {
        for (let repeat = 1; repeat <= repeats; repeat++) {
          onProgress?.({ current: ++current, total, modelId, promptId: prompt.id, repeat });
          const batteryStart = await BatteryService.level();
          const { result, peakBytes } = await measurePeak(() =>
            LlamaService.generateChatCompletion({
              modelId, messages: [{ role: "user", content: prompt.text }],
              contextSize: settings.contextSize, temperature: settings.temperature, topP: settings.topP,
              maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
            })
          );
          const batteryEnd = await BatteryService.level();
          const run: BenchmarkRun = {
            ...memoryFieldsFor(load, peakBytes),
            id: createId("bench"), taskType: "chat", modelId, documentId: null, chunkStrategy: null, topK: null,
            promptText: prompt.text, promptTokenEstimate: estimateTokens(prompt.text),
            outputTokenEstimate: result.stats.outputTokens,
            retrievalTimeMs: null, generationTimeMs: result.stats.totalTimeMs,
            totalTimeMs: result.stats.totalTimeMs,
            tokensPerSecond: result.stats.tokensPerSecond, selectedChunkIds: null,
            notes: "sweep:model", createdAt: nowIso(),
            batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd),
            promptId: prompt.id, promptCategory: prompt.category, repeatIndex: repeat,
            // Ngarkimi ndodh një herë për model, prandaj koha e tij i shoqërohet vetëm matjes së parë.
            loadTimeMs: firstOfModel ? load.loadTimeMs ?? result.stats.loadTimeMs ?? null : null,
          };
          firstOfModel = false;
          await benchmarkRepository.addRun(run);
          runs.push(run);
        }
      }
    }
    return runs;
  },

  /**
   * Sweep i plotë RAG: çdo model i shkarkuar × çdo madhësi cope × çdo pyetje × përsëritje.
   * Kjo është matrica që ushqen krahasimin e madhësisë së copave në Kapitullin 6.
   */
  async runDocumentSweep(
    documentId: string,
    onProgress?: (p: SweepProgress) => void,
    options?: { prompts?: BenchPrompt[]; repeats?: number }
  ) {
    const settings = await settingsRepository.getSettings();
    const doc = await documentRepository.getDocument(documentId);
    if (!doc) throw new Error("Document not found.");
    const models = await availableModels(settings.useMockInference);
    if (models.length === 0) throw new Error("No downloaded models to benchmark. Download at least one model first.");
    const prompts = options?.prompts ?? DOC_PROMPTS;
    const repeats = Math.max(1, options?.repeats ?? DEFAULT_REPEATS);
    const embedKind = (await EmbeddingService.modelExists()) ? "neural" : "tfidf";
    const runs: BenchmarkRun[] = [];
    const total = models.length * CHUNK_SIZES.length * prompts.length * repeats;
    let current = 0;

    for (const modelId of models) {
      const load = await measureModelLoad(modelId, settings.contextSize, !settings.useMockInference);
      let firstOfModel = true;
      for (const chunkSize of CHUNK_SIZES) {
        const strategy = toStrategy(chunkSize);
        const chunks = await documentRepository.getChunks(documentId, strategy);
        for (const prompt of prompts) {
          for (let repeat = 1; repeat <= repeats; repeat++) {
            onProgress?.({ current: ++current, total, modelId, chunkSize, promptId: prompt.id, repeat });
            const retrievalStarted = Date.now();
            const selected = await retrieveChunks(prompt.text, chunks, { topK: settings.ragTopK });
            const retrievalTimeMs = Date.now() - retrievalStarted;
            const promptMessages = buildRagPrompt(doc.title, prompt.text, selected);
            const batteryStart = await BatteryService.level();
            const { result, peakBytes } = await measurePeak(() =>
              LlamaService.generateChatCompletion({
                modelId, messages: promptMessages, contextSize: settings.contextSize,
                temperature: settings.temperature, topP: settings.topP,
                maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
              })
            );
            const batteryEnd = await BatteryService.level();
            const promptText = promptMessages[0].content;
            const run: BenchmarkRun = {
              ...memoryFieldsFor(load, peakBytes),
              id: createId("bench"), taskType: "document_qa", modelId, documentId,
              chunkStrategy: strategy, topK: settings.ragTopK,
              promptText, promptTokenEstimate: estimateTokens(promptText),
              outputTokenEstimate: result.stats.outputTokens,
              retrievalTimeMs, generationTimeMs: result.stats.totalTimeMs,
              totalTimeMs: result.stats.totalTimeMs + retrievalTimeMs,
              tokensPerSecond: result.stats.tokensPerSecond,
              selectedChunkIds: JSON.stringify(selected.map((c) => c.id)),
              notes: `sweep:rag embed=${embedKind}`, createdAt: nowIso(),
              batteryStart, batteryEnd, batteryDelta: batteryDeltaPct(batteryStart, batteryEnd),
              promptId: prompt.id, promptCategory: prompt.category, repeatIndex: repeat,
              loadTimeMs: firstOfModel ? load.loadTimeMs ?? result.stats.loadTimeMs ?? null : null,
            };
            firstOfModel = false;
            await benchmarkRepository.addRun(run);
            runs.push(run);
          }
        }
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
    const { result, memory } = await withMemory(() => LlamaService.generateChatCompletion({
      modelId: settings.activeModelId as ModelId, messages, contextSize: settings.contextSize, temperature: settings.temperature,
      topP: settings.topP, maxTokens: settings.maxTokens, useMockInference: settings.useMockInference,
    }));
    const batteryEnd = await BatteryService.level();
    const rouge = computeRouge(result.text, referenceSummary);
    const run: BenchmarkRun = {
      ...memory,
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

  /**
   * Vlerëson saktësinë e marrjes së informacionit (P3) pa e përfshirë gjenerimin.
   *
   * Meqë nuk ekzekutohet asnjë model, kjo matje është e shpejtë dhe e përsëritshme: ajo
   * izolon cilësinë e marrjes nga cilësia e përgjigjes, të cilat ndryshe do të ngatërroheshin.
   * Matet për çdo madhësi cope dhe për disa vlera të top-K.
   */
  async runRetrievalEval(
    documentId: string,
    groundTruth: RetrievalGroundTruth[],
    options?: { topKs?: number[] }
  ) {
    if (groundTruth.length === 0) throw new Error("Provide at least one question with a known answer.");
    const doc = await documentRepository.getDocument(documentId);
    if (!doc) throw new Error("Document not found.");
    const topKs = options?.topKs ?? [1, 3, 5];
    const embeddingKind: RetrievalEvalRun["embeddingKind"] =
      (await EmbeddingService.modelExists()) ? "neural" : "tfidf";
    const runs: RetrievalEvalRun[] = [];

    for (const chunkSize of CHUNK_SIZES) {
      const strategy = toStrategy(chunkSize);
      const chunks = await documentRepository.getChunks(documentId, strategy);
      if (chunks.length === 0) continue;

      for (const topK of topKs) {
        const metrics = [];
        const times: number[] = [];
        for (const item of groundTruth) {
          const started = Date.now();
          const selected = await retrieveChunks(item.question, chunks, { topK });
          times.push(Date.now() - started);
          metrics.push(evaluateRetrieval(selected, item.answerSpans));
        }
        const avg = averageRetrievalMetrics(metrics);
        const run: RetrievalEvalRun = {
          id: createId("reteval"),
          documentId,
          chunkStrategy: strategy,
          topK,
          embeddingKind,
          questionCount: avg.questionCount,
          hitRate: avg.hitRate,
          recallAtK: avg.recallAtK,
          precisionAtK: avg.precisionAtK,
          mrr: avg.mrr,
          retrievalTimeMsMean: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
          createdAt: nowIso(),
        };
        await retrievalEvalRepository.addRun(run);
        runs.push(run);
      }
    }
    return runs;
  },

  // Eksport i vlerësimit të marrjes: një rresht për copëzim × top-K.
  async exportRetrievalCsv() {
    const runs = await retrievalEvalRepository.listRuns();
    const cols: (keyof RetrievalEvalRun)[] = [
      "createdAt", "documentId", "chunkStrategy", "topK", "embeddingKind", "questionCount",
      "hitRate", "recallAtK", "precisionAtK", "mrr", "retrievalTimeMsMean",
    ];
    const round = (v: unknown) => (typeof v === "number" ? Math.round(v * 10000) / 10000 : v);
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(round(v)).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(","), ...runs.map((r) => cols.map((c) => esc(r[c])).join(","))];
    const path = `${FileSystem.documentDirectory}pocketai-retrieval-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, lines.join("\n"));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
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
      "promptId", "promptCategory", "repeatIndex", "loadTimeMs",
      "batteryStart", "batteryEnd", "batteryDelta", "rouge1", "rouge2", "rougeL",
      "memoryMetric", "memoryBaselineBytes", "memoryAfterLoadBytes", "memoryModelBytes",
      "memoryPeakBytes", "memoryDeltaBytes", "deviceTotalMemoryBytes", "notes",
    ];
    // Kolona ndihmëse në MB, që tabelat e Kapitullit 6 të mos kërkojnë konvertim manual.
    const mbCols: { header: string; key: keyof BenchmarkRun }[] = [
      { header: "memoryModelMb", key: "memoryModelBytes" },
      { header: "memoryPeakMb", key: "memoryPeakBytes" },
    ];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [
      [...cols, ...mbCols.map((m) => m.header)].join(","),
      ...runs.map((r) => [
        ...cols.map((c) => esc(r[c])),
        ...mbCols.map((m) => esc(bytesToMb(r[m.key] as number | null | undefined))),
      ].join(",")),
    ];
    const path = `${FileSystem.documentDirectory}pocketai-benchmarks-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, lines.join("\n"));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
  },

  /**
   * Eksport i përmbledhur: një rresht për konfigurim, me mesatare dhe devijim standard.
   * Ky është formati që u përgjigjet drejtpërdrejt tabelave të Kapitullit 6.
   */
  async exportAggregateCsv() {
    const rows = aggregateRuns(await benchmarkRepository.listRuns());
    const cols: (keyof AggregateRow)[] = [
      "taskType", "modelId", "chunkStrategy", "runCount", "promptCount",
      "tokensPerSecondMean", "tokensPerSecondSd", "generationMsMean", "generationMsSd",
      "retrievalMsMean", "loadTimeMsMean",
      "memoryModelMbMean", "memoryPeakMbMean", "memoryPeakMbSd", "batteryDeltaMean", "memoryMetric",
    ];
    const round = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(round(v)).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))];
    const path = `${FileSystem.documentDirectory}pocketai-aggregate-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, lines.join("\n"));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    return path;
  },

  // Përmbledhja e grupuar, e dobishme edhe për shfaqje brenda aplikacionit.
  async summary() {
    return aggregateRuns(await benchmarkRepository.listRuns());
  }
};
