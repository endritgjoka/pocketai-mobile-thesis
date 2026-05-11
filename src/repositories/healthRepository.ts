import { execute, queryFirst } from "../db/database";
import { HealthSnapshot } from "../types/health";

const mapRow = (row: any): HealthSnapshot => ({
  id: row.id,
  date: row.date,
  stepsToday: row.steps_today,
  stepsYesterday: row.steps_yesterday,
  sleepHoursLastNight: row.sleep_hours_last_night,
  averageHeartRate: row.average_heart_rate,
  source: row.source,
  permissionStatus: row.permission_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const healthRepository = {
  async saveSnapshot(snapshot: HealthSnapshot) {
    await execute(
      "INSERT OR REPLACE INTO health_snapshots (id, date, steps_today, steps_yesterday, sleep_hours_last_night, average_heart_rate, source, permission_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [snapshot.id, snapshot.date, snapshot.stepsToday, snapshot.stepsYesterday, snapshot.sleepHoursLastNight, snapshot.averageHeartRate, snapshot.source, snapshot.permissionStatus, snapshot.createdAt, snapshot.updatedAt]
    );
  },

  async getLatestSnapshot(): Promise<HealthSnapshot | null> {
    const row = await queryFirst<any>("SELECT * FROM health_snapshots ORDER BY updated_at DESC LIMIT 1");
    return row ? mapRow(row) : null;
  }
};
