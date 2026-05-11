import { Conversation, InferenceStats, Message, MessageRole } from "../types";
import { execute, queryAll, queryFirst } from "../db/database";
import { createId } from "../utils/errors";
import { nowIso } from "../utils/dates";

const mapConversation = (row: Record<string, unknown>): Conversation => ({
  id: String(row.id),
  threadId: row.thread_id ? String(row.thread_id) : null,
  folderId: row.folder_id ? String(row.folder_id) : row.thread_id ? String(row.thread_id) : null,
  title: String(row.title),
  modelId: String(row.model_id),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  lastMessage: row.last_message ? String(row.last_message) : null
});

const mapMessage = (row: Record<string, unknown>): Message => ({
  id: String(row.id),
  conversationId: String(row.conversation_id),
  role: String(row.role) as MessageRole,
  content: String(row.content),
  tokenCount: row.token_count === null || row.token_count === undefined ? null : Number(row.token_count),
  createdAt: String(row.created_at),
  stats: row.stats_json ? (JSON.parse(String(row.stats_json)) as InferenceStats) : null
});

export const chatRepository = {
  async listConversations() {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT c.*, (
        SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      ) AS last_message
      FROM conversations c ORDER BY updated_at DESC`
    );
    return rows.map(mapConversation);
  },

  async createConversation(modelId: string, title = "New Chat", folderId: string | null = null) {
    const now = nowIso();
    const id = createId("conv");
    await execute(
      "INSERT INTO conversations (id, thread_id, folder_id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, folderId, folderId, title, modelId, now, now]
    );
    return { id, threadId: folderId, folderId, title, modelId, createdAt: now, updatedAt: now } satisfies Conversation;
  },

  async getConversation(id: string) {
    const row = await queryFirst<Record<string, unknown>>("SELECT * FROM conversations WHERE id = ?", [id]);
    return row ? mapConversation(row) : null;
  },

  async renameConversation(id: string, title: string) {
    await execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [title.trim() || "New Chat", nowIso(), id]);
  },

  async updateConversationFolder(id: string, folderId: string | null) {
    await execute("UPDATE conversations SET folder_id = ?, thread_id = ?, updated_at = ? WHERE id = ?", [folderId, folderId, nowIso(), id]);
  },

  async updateConversationModel(id: string, modelId: string) {
    await execute("UPDATE conversations SET model_id = ?, updated_at = ? WHERE id = ?", [modelId, nowIso(), id]);
  },

  async deleteConversation(id: string) {
    await execute("DELETE FROM messages WHERE conversation_id = ?", [id]);
    await execute("DELETE FROM inference_runs WHERE conversation_id = ?", [id]);
    await execute("DELETE FROM conversations WHERE id = ?", [id]);
  },

  async deleteEmptyConversation(id: string) {
    const row = await queryFirst<{ count: number }>("SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?", [id]);
    if ((row?.count ?? 0) === 0) await execute("DELETE FROM conversations WHERE id = ?", [id]);
  },

  async listMessages(conversationId: string) {
    const rows = await queryAll<Record<string, unknown>>(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [conversationId]
    );
    return rows.map(mapMessage);
  },

  async addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    tokenCount?: number | null;
    stats?: InferenceStats | null;
  }) {
    const now = nowIso();
    const id = createId("msg");
    await execute(
      "INSERT INTO messages (id, conversation_id, role, content, token_count, stats_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, input.conversationId, input.role, input.content, input.tokenCount ?? null, input.stats ? JSON.stringify(input.stats) : null, now]
    );
    await execute("UPDATE conversations SET updated_at = ? WHERE id = ?", [now, input.conversationId]);
    return { id, conversationId: input.conversationId, role: input.role, content: input.content, tokenCount: input.tokenCount ?? null, stats: input.stats ?? null, createdAt: now };
  },

  async deleteMessage(id: string) {
    await execute("DELETE FROM messages WHERE id = ?", [id]);
  },

  async clear() {
    await execute("DELETE FROM messages");
    await execute("DELETE FROM inference_runs");
    await execute("DELETE FROM conversations");
  }
};
