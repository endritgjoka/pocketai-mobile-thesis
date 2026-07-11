// Kampionim i nivelit të baterisë (0..1) përmes expo-battery, i mbrojtur për pajisje/simulatorë pa mbështetje.
export const BatteryService = {
  async level(): Promise<number | null> {
    try {
      const Battery = await import("expo-battery");
      const lvl = await Battery.getBatteryLevelAsync();
      return typeof lvl === "number" && lvl >= 0 ? lvl : null;
    } catch {
      return null;
    }
  },
};

// Kthen deltën në përqindje (pozitive = shpenzim) ose null nëse s'ka lexim të vlefshëm.
export const batteryDeltaPct = (start: number | null, end: number | null): number | null => {
  if (start === null || end === null) return null;
  return (start - end) * 100;
};
