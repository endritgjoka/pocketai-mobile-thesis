import { BenchmarkRun } from "../../types";

// Mesatarja dhe devijimi standard i kampionit (n-1), i cili është forma e duhur kur
// matjet janë një kampion i ekzekutimeve dhe jo i gjithë popullimi.
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const stdDev = (values: number[]) => {
  if (values.length < 2) return null;
  const m = mean(values) as number;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const nums = (runs: BenchmarkRun[], pick: (r: BenchmarkRun) => number | null | undefined): number[] =>
  runs.map(pick).filter((v): v is number => typeof v === "number" && isFinite(v));

export type AggregateRow = {
  taskType: string;
  modelId: string;
  chunkStrategy: string;
  runCount: number;
  promptCount: number;
  tokensPerSecondMean: number | null;
  tokensPerSecondSd: number | null;
  generationMsMean: number | null;
  generationMsSd: number | null;
  retrievalMsMean: number | null;
  loadTimeMsMean: number | null;
  memoryModelMbMean: number | null;
  memoryPeakMbMean: number | null;
  memoryPeakMbSd: number | null;
  batteryDeltaMean: number | null;
  memoryMetric: string | null;
};

const toMb = (bytes: number) => bytes / (1024 * 1024);

/**
 * Grupon ekzekutimet sipas konfigurimit (lloji i detyrës, modeli, madhësia e copës) dhe
 * kthen mesataret me devijim standard. Kjo është forma që u duhet tabelave të Kapitullit 6:
 * një rresht për konfigurim, jo një rresht për ekzekutim.
 */
export const aggregateRuns = (runs: BenchmarkRun[]): AggregateRow[] => {
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of runs) {
    const key = `${run.taskType}|${run.modelId}|${run.chunkStrategy ?? "-"}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(run);
    else groups.set(key, [run]);
  }

  const rows: AggregateRow[] = [];
  for (const [key, group] of groups) {
    const [taskType, modelId, chunkStrategy] = key.split("|");
    const tps = nums(group, (r) => r.tokensPerSecond);
    const gen = nums(group, (r) => r.generationTimeMs);
    const peak = nums(group, (r) => r.memoryPeakBytes).map(toMb);
    rows.push({
      taskType,
      modelId,
      chunkStrategy,
      runCount: group.length,
      promptCount: new Set(group.map((r) => r.promptId ?? r.promptText)).size,
      tokensPerSecondMean: mean(tps),
      tokensPerSecondSd: stdDev(tps),
      generationMsMean: mean(gen),
      generationMsSd: stdDev(gen),
      retrievalMsMean: mean(nums(group, (r) => r.retrievalTimeMs)),
      loadTimeMsMean: mean(nums(group, (r) => r.loadTimeMs)),
      memoryModelMbMean: mean(nums(group, (r) => r.memoryModelBytes).map(toMb)),
      memoryPeakMbMean: mean(peak),
      memoryPeakMbSd: stdDev(peak),
      batteryDeltaMean: mean(nums(group, (r) => r.batteryDelta)),
      memoryMetric: group.find((r) => r.memoryMetric)?.memoryMetric ?? null,
    });
  }

  return rows.sort((a, b) =>
    a.taskType.localeCompare(b.taskType) ||
    a.modelId.localeCompare(b.modelId) ||
    a.chunkStrategy.localeCompare(b.chunkStrategy)
  );
};
