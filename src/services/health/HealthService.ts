import { NativeModules, Platform } from "react-native";
import { HealthAvailability, HealthPermissionStatus, HealthSnapshot } from "../../types/health";
import { createId } from "../../utils/errors";
import { nowIso } from "../../utils/dates";

type HealthValue = { value?: number; startDate?: string; endDate?: string };
type HealthConnectModule = typeof import("react-native-health-connect");

type PocketAIHealthKitModule = {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  getStepCount: (startDate: string, endDate: string) => Promise<number | null>;
  getSleepHours: (startDate: string, endDate: string) => Promise<number | null>;
  getAverageHeartRate: (startDate: string, endDate: string) => Promise<number | null>;
};

const getPocketAIHealthKit = (): PocketAIHealthKitModule | null => {
  if (Platform.OS !== "ios") return null;
  return (NativeModules.PocketAIHealthKit as PocketAIHealthKitModule | undefined) ?? null;
};

const dayRange = (offsetDays = 0) => {
  const start = new Date();
  start.setDate(start.getDate() + offsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const sleepRange = () => {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const tryLoadHealthKit = (): any | null => {
  try {
    const healthKit = require("react-native-health");
    if (healthKit?.initHealthKit) return healthKit;
  } catch {
    // Fall through to the native-module lookup below. The public export is preferred,
    // but older React Native bridges can expose the module only through NativeModules.
  }

  try {
    const nativeModules = require("react-native").NativeModules;
    const appleHealthKit = nativeModules?.AppleHealthKit ?? nativeModules?.RCTAppleHealthKit;
    if (!appleHealthKit) return null;
    const constants = require("react-native-health/src/constants");
    return {
      ...appleHealthKit,
      Constants: {
        Activities: constants.Activities,
        Observers: constants.Observers,
        Permissions: constants.Permissions,
        Units: constants.Units
      }
    };
  } catch {
    return null;
  }
};

const tryLoadHealthConnect = (): HealthConnectModule | null => {
  try {
    return require("react-native-health-connect");
  } catch {
    return null;
  }
};

const healthKitPermissions = () => {
  const permissions = tryLoadHealthKit()?.Constants?.Permissions;
  return { permissions: { read: [permissions?.Steps, permissions?.SleepAnalysis, permissions?.HeartRate].filter(Boolean), write: [] } };
};

const healthKitModuleAvailable = () => Platform.OS === "ios" && Boolean(getPocketAIHealthKit() ?? tryLoadHealthKit());

const healthKitAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== "ios") return false;
  const pocketHealth = getPocketAIHealthKit();
  if (pocketHealth) return pocketHealth.isAvailable();
  const kit = tryLoadHealthKit();
  if (!kit?.isAvailable) return false;
  return new Promise((resolve) => kit.isAvailable((_error: unknown, available: boolean) => resolve(Boolean(available))));
};

const getHealthKitPermissionStatus = async (): Promise<HealthPermissionStatus> => {
  const pocketHealth = getPocketAIHealthKit();
  if (pocketHealth) {
    try {
      if (!(await pocketHealth.isAvailable())) return "unsupported";
      // HealthKit intentionally does not expose reliable read-permission status.
      // A successful read query is the practical source of truth for this prototype.
      await pocketHealth.getStepCount(dayRange(0).startDate, dayRange(0).endDate);
      return "granted";
    } catch {
      return "not_determined";
    }
  }

  const kit = tryLoadHealthKit();
  if (!kit) return "unsupported";
  if (!kit.getAuthStatus) return "not_determined";
  if (!(await healthKitAvailable())) return "not_determined";

  return new Promise((resolve) => kit.getAuthStatus(healthKitPermissions(), (_error: unknown, result: any) => {
    const readStatuses = result?.permissions?.read ?? [];
    // HealthKit read authorization is intentionally limited by Apple. This is the best available native signal;
    // successful reads after authorization are also treated as granted by requestPermissions/fetch flows.
    if (!readStatuses.length) return resolve("unknown");
    if (readStatuses.every((status: number) => status === 2)) return resolve("granted");
    if (readStatuses.some((status: number) => status === 1)) return resolve("denied");
    if (readStatuses.some((status: number) => status === 0)) return resolve("not_determined");
    return resolve("unknown");
  }));
};

const initHealthKit = async (): Promise<HealthPermissionStatus> => {
  const pocketHealth = getPocketAIHealthKit();
  if (pocketHealth) {
    try {
      return (await pocketHealth.requestPermissions()) ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  const kit = tryLoadHealthKit();
  if (!kit?.initHealthKit) return "unsupported";

  return new Promise((resolve) => {
    let didResolve = false;
    const finish = (status: HealthPermissionStatus) => {
      if (didResolve) return;
      didResolve = true;
      clearTimeout(timeoutId);
      resolve(status);
    };

    const timeoutId = setTimeout(() => {
      finish("not_determined");
    }, 12000);

    try {
      kit.initHealthKit(healthKitPermissions(), (error: string) => {
        if (error) return finish("denied");
        // HealthKit does not reliably report read authorization after the user responds.
        // A successful init means the system permission flow completed and reads can be attempted.
        finish("granted");
      });
    } catch {
      finish("unsupported");
    }
  });
};

const readHealthKitValue = async (method: string, range: { startDate: string; endDate: string }): Promise<any> => {
  const pocketHealth = getPocketAIHealthKit();
  if (pocketHealth) {
    try {
      if (method === "getStepCount") return { value: await pocketHealth.getStepCount(range.startDate, range.endDate) };
      if (method === "getSleepHours") return await pocketHealth.getSleepHours(range.startDate, range.endDate);
      if (method === "getAverageHeartRate") return await pocketHealth.getAverageHeartRate(range.startDate, range.endDate);
    } catch {
      return null;
    }
  }

  const kit = tryLoadHealthKit();
  if (!kit?.[method]) return null;
  return new Promise((resolve) => kit[method](range, (_err: string, result: unknown) => resolve(result)));
};

const getHealthConnectPermissionStatus = async (): Promise<HealthPermissionStatus> => {
  const hc = tryLoadHealthConnect();
  if (!hc || Platform.OS !== "android") return "unsupported";
  try {
    const initialized = await hc.initialize();
    if (!initialized) return "unsupported";
    const granted = await hc.getGrantedPermissions();
    const required = ["Steps", "SleepSession", "HeartRate"];
    const grantedTypes = granted.map((permission: any) => permission.recordType);
    return required.every((recordType) => grantedTypes.includes(recordType)) ? "granted" : "not_determined";
  } catch {
    return "unsupported";
  }
};

const requestHealthConnect = async (): Promise<HealthPermissionStatus> => {
  const hc = tryLoadHealthConnect();
  if (!hc || Platform.OS !== "android") return "unsupported";
  const initialized = await hc.initialize();
  if (!initialized) return "unsupported";
  await hc.requestPermission([
    { accessType: "read", recordType: "Steps" },
    { accessType: "read", recordType: "SleepSession" },
    { accessType: "read", recordType: "HeartRate" }
  ] as any);
  return getHealthConnectPermissionStatus();
};

const readHealthConnectRecords = async (recordType: string, range: { startDate: string; endDate: string }) => {
  const hc = tryLoadHealthConnect();
  if (!hc || Platform.OS !== "android") return [];
  const result: any = await hc.readRecords(recordType as any, { timeRangeFilter: { operator: "between", startTime: range.startDate, endTime: range.endDate } });
  return result.records ?? [];
};

export const HealthService = {
  async isAvailable(): Promise<HealthAvailability> {
    if (Platform.OS === "ios") {
      if (!healthKitModuleAvailable()) return "unsupported";
      return "available";
    }
    if (Platform.OS === "android") {
      const hc = tryLoadHealthConnect();
      if (!hc) return "unsupported";
      try { return (await hc.initialize()) ? "available" : "unsupported"; } catch { return "unsupported"; }
    }
    return "unsupported";
  },

  async getPermissionStatus(): Promise<HealthPermissionStatus> {
    if (Platform.OS === "ios") return getHealthKitPermissionStatus();
    if (Platform.OS === "android") return getHealthConnectPermissionStatus();
    return "unsupported";
  },

  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (Platform.OS === "ios") return initHealthKit();
    if (Platform.OS === "android") return requestHealthConnect();
    return "unsupported";
  },

  async fetchYesterdaySteps() {
    if (Platform.OS === "ios") return ((await readHealthKitValue("getStepCount", dayRange(-1))) as HealthValue | null)?.value ?? null;
    const records: any[] = await readHealthConnectRecords("Steps", dayRange(-1));
    return records.reduce((sum, record) => sum + (record.count ?? 0), 0) || null;
  },

  async fetchSleepLastNight() {
    if (Platform.OS === "ios") {
      const nativeSleepHours = await readHealthKitValue("getSleepHours", sleepRange());
      if (typeof nativeSleepHours === "number") return nativeSleepHours || null;
      const samples = ((await readHealthKitValue("getSleepSamples", sleepRange())) as HealthValue[] | null) ?? [];
      const ms = samples.reduce((sum, item) => sum + Math.max(0, new Date(item.endDate ?? 0).getTime() - new Date(item.startDate ?? 0).getTime()), 0);
      return ms ? ms / 36e5 : null;
    }
    const records: any[] = await readHealthConnectRecords("SleepSession", sleepRange());
    const ms = records.reduce((sum, item) => sum + Math.max(0, new Date(item.endTime ?? 0).getTime() - new Date(item.startTime ?? 0).getTime()), 0);
    return ms ? ms / 36e5 : null;
  },

  async fetchAverageHeartRateToday() {
    if (Platform.OS === "ios") {
      const nativeAverage = await readHealthKitValue("getAverageHeartRate", dayRange(0));
      if (typeof nativeAverage === "number") return nativeAverage || null;
      const samples = ((await readHealthKitValue("getHeartRateSamples", dayRange(0))) as HealthValue[] | null) ?? [];
      return avg(samples.map((item) => item.value ?? 0).filter(Boolean));
    }
    const records: any[] = await readHealthConnectRecords("HeartRate", dayRange(0));
    return avg(records.flatMap((record) => record.samples ?? []).map((sample: any) => sample.beatsPerMinute).filter(Boolean));
  },

  async fetchTodaySnapshot(permissionStatus: HealthPermissionStatus = "unknown"): Promise<HealthSnapshot> {
    const source = Platform.OS === "ios" ? "healthkit" : Platform.OS === "android" ? "health_connect" : "unsupported";
    const [stepsTodayValue, stepsYesterday, sleepHoursLastNight, averageHeartRate] = await Promise.all([
      Platform.OS === "ios" ? readHealthKitValue("getStepCount", dayRange(0)).then((value: HealthValue | null) => value?.value ?? null) : readHealthConnectRecords("Steps", dayRange(0)).then((records: any[]) => records.reduce((sum, record) => sum + (record.count ?? 0), 0) || null),
      this.fetchYesterdaySteps(),
      this.fetchSleepLastNight(),
      this.fetchAverageHeartRateToday()
    ]);
    const timestamp = nowIso();
    return { id: createId("health"), date: dayRange(0).startDate.slice(0, 10), stepsToday: stepsTodayValue, stepsYesterday, sleepHoursLastNight, averageHeartRate, source, permissionStatus, createdAt: timestamp, updatedAt: timestamp };
  }
};
