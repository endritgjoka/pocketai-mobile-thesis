import { PermissionStatus } from "./permissions";

export type HealthAvailability = "available" | "unsupported";
export type HealthPermissionStatus = PermissionStatus;

export interface HealthSnapshot {
  id: string;
  date: string;
  stepsToday: number | null;
  stepsYesterday: number | null;
  sleepHoursLastNight: number | null;
  averageHeartRate: number | null;
  source: "healthkit" | "health_connect" | "unsupported";
  permissionStatus: HealthPermissionStatus;
  createdAt: string;
  updatedAt: string;
}
