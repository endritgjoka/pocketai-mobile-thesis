import { execute, queryAll, queryFirst } from "../db/database";
import { Folder } from "../types";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/errors";

const mapFolder = (row: Record<string, unknown>): Folder => ({
  id: String(row.id),
  name: String(row.name),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  sortOrder: row.sort_order === null || row.sort_order === undefined ? null : Number(row.sort_order)
});

export const folderRepository = {
  async listFolders() {
    const rows = await queryAll<Record<string, unknown>>("SELECT * FROM folders ORDER BY COALESCE(sort_order, 999999), updated_at DESC, name ASC");
    return rows.map(mapFolder);
  },

  async createFolder(name: string) {
    const now = nowIso();
    const id = createId("folder");
    const cleanName = name.trim() || "Research";
    await execute("INSERT INTO folders (id, name, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?)", [id, cleanName, now, now, null]);
    return { id, name: cleanName, createdAt: now, updatedAt: now, sortOrder: null } satisfies Folder;
  },

  async renameFolder(id: string, name: string) {
    await execute("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", [name.trim() || "Untitled folder", nowIso(), id]);
  },

  async deleteFolderOnly(id: string) {
    const now = nowIso();
    await execute("UPDATE conversations SET folder_id = NULL, thread_id = NULL, updated_at = ? WHERE folder_id = ?", [now, id]);
    await execute("DELETE FROM folders WHERE id = ?", [id]);
  },

  async deleteFolderAndConversations(id: string) {
    const rows = await queryAll<{ id: string }>("SELECT id FROM conversations WHERE folder_id = ?", [id]);
    for (const row of rows) {
      await execute("DELETE FROM messages WHERE conversation_id = ?", [row.id]);
      await execute("DELETE FROM inference_runs WHERE conversation_id = ?", [row.id]);
      await execute("DELETE FROM conversations WHERE id = ?", [row.id]);
    }
    await execute("DELETE FROM folders WHERE id = ?", [id]);
  },

  async getById(id: string) {
    const row = await queryFirst<Record<string, unknown>>("SELECT * FROM folders WHERE id = ?", [id]);
    return row ? mapFolder(row) : null;
  }
};
