import { DocumentChunk, DocumentRecord } from "../types";
import { execute, queryAll, queryFirst } from "../db/database";

const mapDoc = (row: Record<string, unknown>): DocumentRecord => ({
  id: String(row.id),
  title: String(row.title),
  filename: String(row.filename),
  fileType: String(row.file_type),
  localPath: String(row.local_path),
  status: String(row.status) as DocumentRecord["status"],
  text: String(row.text),
  characterCount: Number(row.character_count),
  chunkCount: Number(row.chunk_count),
  chunkStrategy: String(row.chunk_strategy),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at)
});

const mapChunk = (row: Record<string, unknown>): DocumentChunk => ({
  id: String(row.id),
  documentId: String(row.document_id),
  chunkIndex: Number(row.chunk_index),
  text: String(row.text),
  tokenCount: Number(row.token_count),
  strategy: String(row.strategy) as DocumentChunk["strategy"],
  createdAt: String(row.created_at)
});

export const documentRepository = {
  async listDocuments() {
    const rows = await queryAll<Record<string, unknown>>("SELECT * FROM documents ORDER BY updated_at DESC");
    return rows.map(mapDoc);
  },

  async getDocument(id: string) {
    const row = await queryFirst<Record<string, unknown>>("SELECT * FROM documents WHERE id = ?", [id]);
    return row ? mapDoc(row) : null;
  },

  async upsertDocument(doc: DocumentRecord) {
    await execute(
      `INSERT OR REPLACE INTO documents
       (id, title, filename, file_type, local_path, status, text, character_count, chunk_count, chunk_strategy, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.title, doc.filename, doc.fileType, doc.localPath, doc.status, doc.text, doc.characterCount, doc.chunkCount, doc.chunkStrategy, doc.createdAt, doc.updatedAt]
    );
  },

  async replaceChunks(documentId: string, chunks: DocumentChunk[]) {
    await execute("DELETE FROM document_chunks WHERE document_id = ?", [documentId]);
    for (const chunk of chunks) {
      await execute(
        "INSERT INTO document_chunks (id, document_id, chunk_index, text, token_count, strategy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [chunk.id, chunk.documentId, chunk.chunkIndex, chunk.text, chunk.tokenCount, chunk.strategy, chunk.createdAt]
      );
    }
  },

  async getChunks(documentId: string, strategy?: string) {
    const rows = await queryAll<Record<string, unknown>>(
      strategy
        ? "SELECT * FROM document_chunks WHERE document_id = ? AND strategy = ? ORDER BY chunk_index ASC"
        : "SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
      strategy ? [documentId, strategy] : [documentId]
    );
    return rows.map(mapChunk);
  },

  async deleteDocument(id: string) {
    await execute("DELETE FROM document_chunks WHERE document_id = ?", [id]);
    await execute("DELETE FROM documents WHERE id = ?", [id]);
  },

  async clear() {
    await execute("DELETE FROM document_chunks");
    await execute("DELETE FROM documents");
  }
};
