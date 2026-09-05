import { BenchmarkRun } from "../types";
import { execute, queryAll } from "../db/database";

const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const mapRun = (row: Record<string, unknown>): BenchmarkRun => ({
  id: String(row.id),
  taskType: String(row.task_type) as BenchmarkRun["taskType"],
  modelId: String(row.model_id),
  documentId: row.document_id ? String(row.document_id) : null,
  chunkStrategy: row.chunk_strategy ? String(row.chunk_strategy) : null,
  topK: row.top_k === null || row.top_k === undefined ? null : Number(row.top_k),
  promptText: String(row.prompt_text),
  promptTokenEstimate: Number(row.prompt_token_estimate),
  outputTokenEstimate: Number(row.output_token_estimate),
  retrievalTimeMs: row.retrieval_time_ms === null || row.retrieval_time_ms === undefined ? null : Number(row.retrieval_time_ms),
  generationTimeMs: Number(row.generation_time_ms),
  totalTimeMs: Number(row.total_time_ms),
  tokensPerSecond: row.tokens_per_second === null || row.tokens_per_second === undefined ? null : Number(row.tokens_per_second),
  selectedChunkIds: row.selected_chunk_ids ? String(row.selected_chunk_ids) : null,
  notes: row.notes ? String(row.notes) : null,
  createdAt: String(row.created_at),
  batteryStart: row.battery_start === null || row.battery_start === undefined ? null : Number(row.battery_start),
  batteryEnd: row.battery_end === null || row.battery_end === undefined ? null : Number(row.battery_end),
  batteryDelta: row.battery_delta === null || row.battery_delta === undefined ? null : Number(row.battery_delta),
  rouge1: row.rouge1 === null || row.rouge1 === undefined ? null : Number(row.rouge1),
  rouge2: row.rouge2 === null || row.rouge2 === undefined ? null : Number(row.rouge2),
  rougeL: row.rouge_l === null || row.rouge_l === undefined ? null : Number(row.rouge_l),
  memoryBaselineBytes: numOrNull(row.memory_baseline_bytes),
  memoryAfterLoadBytes: numOrNull(row.memory_after_load_bytes),
  memoryModelBytes: numOrNull(row.memory_model_bytes),
  memoryPeakBytes: numOrNull(row.memory_peak_bytes),
  memoryDeltaBytes: numOrNull(row.memory_delta_bytes),
  deviceTotalMemoryBytes: numOrNull(row.device_total_memory_bytes),
  memoryMetric: row.memory_metric ? String(row.memory_metric) : null,
  promptId: row.prompt_id ? String(row.prompt_id) : null,
  promptCategory: row.prompt_category ? String(row.prompt_category) : null,
  repeatIndex: numOrNull(row.repeat_index),
  loadTimeMs: numOrNull(row.load_time_ms)
});

export const benchmarkRepository = {
  async listRuns() {
    const rows = await queryAll<Record<string, unknown>>("SELECT * FROM benchmark_runs ORDER BY created_at DESC");
    return rows.map(mapRun);
  },

  async addRun(run: BenchmarkRun) {
    await execute(
      `INSERT INTO benchmark_runs
       (id, task_type, model_id, document_id, chunk_strategy, top_k, prompt_text, prompt_token_estimate,
        output_token_estimate, retrieval_time_ms, generation_time_ms, total_time_ms, tokens_per_second,
        selected_chunk_ids, notes, created_at, battery_start, battery_end, battery_delta, rouge1, rouge2, rouge_l,
        memory_baseline_bytes, memory_after_load_bytes, memory_model_bytes, memory_peak_bytes,
        memory_delta_bytes, device_total_memory_bytes, memory_metric,
        prompt_id, prompt_category, repeat_index, load_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [run.id, run.taskType, run.modelId, run.documentId, run.chunkStrategy, run.topK, run.promptText, run.promptTokenEstimate, run.outputTokenEstimate, run.retrievalTimeMs, run.generationTimeMs, run.totalTimeMs, run.tokensPerSecond, run.selectedChunkIds, run.notes, run.createdAt, run.batteryStart ?? null, run.batteryEnd ?? null, run.batteryDelta ?? null, run.rouge1 ?? null, run.rouge2 ?? null, run.rougeL ?? null, run.memoryBaselineBytes ?? null, run.memoryAfterLoadBytes ?? null, run.memoryModelBytes ?? null, run.memoryPeakBytes ?? null, run.memoryDeltaBytes ?? null, run.deviceTotalMemoryBytes ?? null, run.memoryMetric ?? null, run.promptId ?? null, run.promptCategory ?? null, run.repeatIndex ?? null, run.loadTimeMs ?? null]
    );
  },

  async clear() {
    await execute("DELETE FROM benchmark_runs");
  }
};
