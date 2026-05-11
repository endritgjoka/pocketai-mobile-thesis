import { BenchmarkRun } from "../types";
import { execute, queryAll } from "../db/database";

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
  createdAt: String(row.created_at)
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
        selected_chunk_ids, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [run.id, run.taskType, run.modelId, run.documentId, run.chunkStrategy, run.topK, run.promptText, run.promptTokenEstimate, run.outputTokenEstimate, run.retrievalTimeMs, run.generationTimeMs, run.totalTimeMs, run.tokensPerSecond, run.selectedChunkIds, run.notes, run.createdAt]
    );
  },

  async clear() {
    await execute("DELETE FROM benchmark_runs");
  }
};
