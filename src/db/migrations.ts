import * as SQLite from "expo-sqlite";

const hasColumn = async (db: SQLite.SQLiteDatabase, table: string, column: string) => {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
};

export const runMigrations = async (db: SQLite.SQLiteDatabase) => {
  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS models (id TEXT PRIMARY KEY NOT NULL, filename TEXT NOT NULL, local_path TEXT NOT NULL, downloaded INTEGER NOT NULL DEFAULT 0, downloaded_at TEXT, size_bytes INTEGER);
      CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY NOT NULL, thread_id TEXT, title TEXT NOT NULL, model_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, token_count INTEGER, stats_json TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, filename TEXT NOT NULL, file_type TEXT NOT NULL, local_path TEXT NOT NULL, status TEXT NOT NULL, text TEXT NOT NULL, character_count INTEGER NOT NULL, chunk_count INTEGER NOT NULL, chunk_strategy TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS document_chunks (id TEXT PRIMARY KEY NOT NULL, document_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, text TEXT NOT NULL, token_count INTEGER NOT NULL, strategy TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS inference_runs (id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT, document_id TEXT, model_id TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, total_time_ms INTEGER NOT NULL, load_time_ms INTEGER, tokens_per_second REAL, context_size INTEGER NOT NULL, temperature REAL NOT NULL, top_p REAL NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS benchmark_runs (id TEXT PRIMARY KEY NOT NULL, task_type TEXT NOT NULL, model_id TEXT NOT NULL, document_id TEXT, chunk_strategy TEXT, top_k INTEGER, prompt_text TEXT NOT NULL, prompt_token_estimate INTEGER NOT NULL, output_token_estimate INTEGER NOT NULL, retrieval_time_ms INTEGER, generation_time_ms INTEGER NOT NULL, total_time_ms INTEGER NOT NULL, tokens_per_second REAL, selected_chunk_ids TEXT, notes TEXT, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_benchmark_model ON benchmark_runs(model_id);
      PRAGMA user_version = 1;
    `);
  }

  const afterBase = currentVersion < 1 ? 1 : currentVersion;
  if (afterBase < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER);
    `);
    if (!(await hasColumn(db, "conversations", "folder_id"))) {
      await db.execAsync("ALTER TABLE conversations ADD COLUMN folder_id TEXT");
    }
    await db.execAsync(`
      UPDATE conversations SET folder_id = thread_id WHERE folder_id IS NULL AND thread_id IS NOT NULL;
      INSERT OR IGNORE INTO folders (id, name, created_at, updated_at, sort_order) SELECT id, title, created_at, updated_at, NULL FROM threads;
      CREATE INDEX IF NOT EXISTS idx_conversations_folder ON conversations(folder_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_benchmark_model ON benchmark_runs(model_id);
      PRAGMA user_version = 2;
    `);
  }

  const afterFolders = afterBase < 2 ? 2 : afterBase;
  if (afterFolders < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS health_snapshots (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, steps_today INTEGER, steps_yesterday INTEGER, sleep_hours_last_night REAL, average_heart_rate REAL, source TEXT NOT NULL, permission_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_health_snapshots_date ON health_snapshots(date);
      PRAGMA user_version = 3;
    `);
  }

  const afterHealth = afterFolders < 3 ? 3 : afterFolders;
  if (afterHealth < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT, location TEXT, calendar_title TEXT, notes TEXT, all_day INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS calendar_preferences (id TEXT PRIMARY KEY NOT NULL, permission_status TEXT NOT NULL, calendar_integration_enabled INTEGER NOT NULL DEFAULT 0, meeting_reminders_enabled INTEGER NOT NULL DEFAULT 0, reminder_minutes_before INTEGER NOT NULL DEFAULT 30, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_id);
      PRAGMA user_version = 4;
    `);
  }

  const afterCalendar = afterHealth < 4 ? 4 : afterHealth;
  if (afterCalendar < 5) {
    if (!(await hasColumn(db, "document_chunks", "embedding"))) {
      await db.execAsync("ALTER TABLE document_chunks ADD COLUMN embedding TEXT");
    }
    if (!(await hasColumn(db, "document_chunks", "embedding_model"))) {
      await db.execAsync("ALTER TABLE document_chunks ADD COLUMN embedding_model TEXT");
    }
    await db.execAsync("PRAGMA user_version = 5;");
  }
};
