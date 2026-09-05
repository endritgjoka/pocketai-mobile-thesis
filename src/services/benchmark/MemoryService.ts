import { NativeModules, Platform } from "react-native";

// Kampion i memories në një çast të caktuar. Fushat specifike për platformë janë opsionale,
// sepse Android raporton PSS ndërsa iOS raporton phys_footprint.
export type MemorySample = {
  usedBytes: number;
  deviceTotalBytes: number | null;
  deviceAvailableBytes: number | null;
  platform: string;
  // Android
  pssTotalBytes?: number;
  pssNativeBytes?: number;
  pssDalvikBytes?: number;
  nativeHeapBytes?: number;
  javaHeapBytes?: number;
  // iOS
  physFootprintBytes?: number;
  residentBytes?: number;
};

type NativeMemoryModule = { sample: () => Promise<Record<string, unknown>> };

const native: NativeMemoryModule | undefined = (NativeModules as Record<string, unknown>)
  .PocketAIMemory as NativeMemoryModule | undefined;

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

// Emri i metrikës që raportohet si "usedBytes", i nevojshëm për ta shënuar saktë në punim.
// Të dyja metrikat i numërojnë faqet e mapuara nga skedari GGUF, prandaj janë të krahasueshme
// mes platformave dhe shkallëzohen me nivelin e kuantizimit.
export const memoryMetricName = (): string =>
  Platform.OS === "ios" ? "resident_size" : Platform.OS === "android" ? "PSS total" : "n/a";

export const MemoryService = {
  isAvailable(): boolean {
    return typeof native?.sample === "function";
  },

  // Kthen null (dhe jo gabim) kur moduli vendas mungon, që matjet të mos e ndalin sweep-in.
  async sample(): Promise<MemorySample | null> {
    if (!native?.sample) return null;
    try {
      const raw = await native.sample();
      const used = num(raw.usedBytes);
      if (used === null) return null;
      const out: MemorySample = {
        usedBytes: used,
        deviceTotalBytes: num(raw.deviceTotalBytes),
        deviceAvailableBytes: num(raw.deviceAvailableBytes),
        platform: String(raw.platform ?? Platform.OS),
      };
      for (const key of [
        "pssTotalBytes", "pssNativeBytes", "pssDalvikBytes", "nativeHeapBytes",
        "javaHeapBytes", "physFootprintBytes", "residentBytes",
      ] as const) {
        const v = num(raw[key]);
        if (v !== null) out[key] = v;
      }
      return out;
    } catch {
      return null;
    }
  },

  async usedBytes(): Promise<number | null> {
    return (await this.sample())?.usedBytes ?? null;
  },

  /**
   * Ndjek kulmin e memories gjatë një operacioni të gjatë (ngarkimi i modelit ose gjenerimi).
   * Kampionimi bëhet periodikisht nga fija e JS-it; gjenerimi zhvillohet në një fije vendase,
   * prandaj kampionët vazhdojnë të merren edhe gjatë inferencës.
   */
  startPeakTracker(intervalMs = 250) {
    let peak = 0;
    let sum = 0;
    let count = 0;
    let stopped = false;

    const tick = async () => {
      const used = await this.usedBytes();
      if (used !== null && !stopped) {
        if (used > peak) peak = used;
        sum += used;
        count += 1;
      }
    };

    void tick(); // kampioni i parë menjëherë, që matja të mos humbasë operacionet e shkurtra
    const timer = setInterval(() => void tick(), intervalMs);

    return {
      async stop() {
        stopped = true;
        clearInterval(timer);
        return {
          peakBytes: count > 0 ? peak : null,
          meanBytes: count > 0 ? sum / count : null,
          sampleCount: count,
        };
      },
    };
  },

  /**
   * Mbështjell një operacion asinkron dhe kthen matjet e memories rreth tij:
   * para, pas, kulmi dhe rritja neto.
   */
  async measure<T>(fn: () => Promise<T>, intervalMs = 250) {
    const before = await this.usedBytes();
    const tracker = this.startPeakTracker(intervalMs);
    try {
      const value = await fn();
      const { peakBytes, meanBytes, sampleCount } = await tracker.stop();
      const after = await this.usedBytes();
      return {
        value,
        memory: {
          beforeBytes: before,
          afterBytes: after,
          peakBytes: peakBytes !== null && before !== null ? Math.max(peakBytes, before) : peakBytes,
          meanBytes,
          deltaBytes: memoryDelta(before, after),
          sampleCount,
        },
      };
    } catch (e) {
      await tracker.stop();
      throw e;
    }
  },
};

// Rritja neto e memories (pozitive = u shtua memoria e shfrytëzuar).
export const memoryDelta = (start: number | null, end: number | null): number | null => {
  if (start === null || end === null) return null;
  return end - start;
};

export const bytesToMb = (bytes: number | null | undefined): number | null =>
  bytes === null || bytes === undefined ? null : Math.round((bytes / (1024 * 1024)) * 10) / 10;
