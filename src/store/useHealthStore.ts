import { create } from "zustand";
import { HealthAvailability, HealthPermissionStatus, HealthSnapshot } from "../types/health";
import { HealthService } from "../services/health/HealthService";
import { healthRepository } from "../repositories/healthRepository";
import { toUserMessage } from "../utils/errors";

type HealthState = {
  availability: HealthAvailability | "checking";
  permissionStatus: HealthPermissionStatus;
  latestSnapshot: HealthSnapshot | null;
  isLoading: boolean;
  error: string | null;
  checkAvailability: () => Promise<HealthPermissionStatus>;
  requestPermissions: () => Promise<HealthPermissionStatus>;
  refreshSnapshot: () => Promise<void>;
  loadLatestSnapshot: () => Promise<void>;
};

export const useHealthStore = create<HealthState>((set, get) => ({
  availability: "checking",
  permissionStatus: "unknown",
  latestSnapshot: null,
  isLoading: false,
  error: null,
  checkAvailability: async () => {
    set({ availability: "checking", permissionStatus: "unknown", error: null });
    try {
      const availability = await HealthService.isAvailable();
      const permissionStatus = availability === "available" ? await HealthService.getPermissionStatus() : "unsupported";
      set({ availability, permissionStatus, error: null });
      return permissionStatus;
    } catch (error) {
      set({ availability: "unsupported", permissionStatus: "unsupported", error: toUserMessage(error, "Fitness integration is not available on this device.") });
      return "unsupported";
    }
  },
  requestPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const requestedStatus = await HealthService.requestPermissions();
      const availability = await HealthService.isAvailable();
      const checkedStatus = availability === "available" ? await HealthService.getPermissionStatus() : "unsupported";
      const permissionStatus = requestedStatus === "granted" ? "granted" : checkedStatus;
      set({ availability, permissionStatus, isLoading: false });
      if (permissionStatus === "granted") await get().refreshSnapshot();
      return permissionStatus;
    } catch (error) {
      const message = toUserMessage(error, "Fitness permission could not be requested.");
      set({ permissionStatus: "denied", isLoading: false, error: message });
      return "denied";
    }
  },
  refreshSnapshot: async () => {
    set({ isLoading: true, error: null });
    try {
      let status = get().permissionStatus;
      if (status !== "granted") status = await HealthService.getPermissionStatus();
      if (status !== "granted") throw new Error(status === "unsupported" ? "Fitness integration is not available on this device or simulator." : "Grant fitness permission before refreshing data.");
      const snapshot = await HealthService.fetchTodaySnapshot(status);
      await healthRepository.saveSnapshot(snapshot);
      set({ latestSnapshot: snapshot, permissionStatus: status, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toUserMessage(error, "Fitness data could not be refreshed.") });
    }
  },
  loadLatestSnapshot: async () => {
    set({ latestSnapshot: await healthRepository.getLatestSnapshot() });
  }
}));
