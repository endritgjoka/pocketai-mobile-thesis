import { RetrievalEvalRun } from "../types";
import { execute, queryAll } from "../db/database";

const mapRow = (row: Record<string, unknown>): RetrievalEvalRun => ({
  id: String(row.id),
  documentId: String(row.document_id),
  chunkStrategy: String(row.chunk_strategy),
  topK: Number(row.top_k),
  embeddingKind: String(row.embedding_kind) as RetrievalEvalRun["embeddingKind"],
  questionCount: Number(row.question_count),
  hitRate: Number(row.hit_rate),
  recallAtK: Number(row.recall_at_k),
  precisionAtK: Number(row.precision_at_k),
  mrr: Number(row.mrr),
  retrievalTimeMsMean: row.retrieval_time_ms_mean === null || row.retrieval_time_ms_mean === undefined
    ? null
    : Number(row.retrieval_time_ms_mean),
  createdAt: String(row.created_at)
});

export const retrievalEvalRepository = {
  async listRuns() {
    const rows = await queryAll<Record<string, unknown>>(
      "SELECT * FROM retrieval_eval_runs ORDER BY created_at DESC"
    );
    return rows.map(mapRow);
  },

  async addRun(run: RetrievalEvalRun) {
    await execute(
      `INSERT INTO retrieval_eval_runs
       (id, document_id, chunk_strategy, top_k, embedding_kind, question_count,
        hit_rate, recall_at_k, precision_at_k, mrr, retrieval_time_ms_mean, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [run.id, run.documentId, run.chunkStrategy, run.topK, run.embeddingKind, run.questionCount,
       run.hitRate, run.recallAtK, run.precisionAtK, run.mrr, run.retrievalTimeMsMean, run.createdAt]
    );
  },

  async clear() {
    await execute("DELETE FROM retrieval_eval_runs");
  }
};
