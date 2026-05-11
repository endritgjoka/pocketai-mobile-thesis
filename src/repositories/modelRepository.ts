import { LocalModel } from "../types";
import { execute, queryAll, queryFirst } from "../db/database";

const mapModel = (row: Record<string, unknown>): LocalModel => ({
  id: String(row.id),
  filename: String(row.filename),
  localPath: String(row.local_path),
  downloaded: Number(row.downloaded) === 1,
  downloadedAt: row.downloaded_at ? String(row.downloaded_at) : null,
  sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes)
});

export const modelRepository = {
  async getAll() {
    const rows = await queryAll<Record<string, unknown>>("SELECT * FROM models ORDER BY id");
    return rows.map(mapModel);
  },

  async getById(id: string) {
    const row = await queryFirst<Record<string, unknown>>("SELECT * FROM models WHERE id = ?", [id]);
    return row ? mapModel(row) : null;
  },

  async upsert(model: LocalModel) {
    await execute(
      `INSERT OR REPLACE INTO models (id, filename, local_path, downloaded, downloaded_at, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [model.id, model.filename, model.localPath, model.downloaded ? 1 : 0, model.downloadedAt, model.sizeBytes]
    );
  },

  async markDeleted(id: string) {
    await execute("DELETE FROM models WHERE id = ?", [id]);
  }
};
