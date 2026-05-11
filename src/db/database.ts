import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";

let database: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async () => {
  if (!database) {
    database = await SQLite.openDatabaseAsync("pocketai.db");
  }
  return database;
};

export const initDatabase = async () => {
  const db = await getDatabase();
  await runMigrations(db);
};

export const execute = async (sql: string, params: SQLite.SQLiteBindParams = []) => {
  const db = await getDatabase();
  return db.runAsync(sql, params);
};

export const queryAll = async <T>(sql: string, params: SQLite.SQLiteBindParams = []) => {
  const db = await getDatabase();
  return db.getAllAsync<T>(sql, params);
};

export const queryFirst = async <T>(sql: string, params: SQLite.SQLiteBindParams = []) => {
  const db = await getDatabase();
  return db.getFirstAsync<T>(sql, params);
};
