import { ContextItem, PrioritizationStrategy, prioritize, DEFAULT_WEIGHTS, ScoringWeights } from "../context";

/**
 * Vlerësimi i algoritmit të prioritizimit të kontekstit (P4).
 *
 * Pyetja kërkimore është nëse algoritmi i propozuar përzgjedh informacion më të përshtatshëm
 * se tri qasjet bazë kur hapësira është e kufizuar. Për t'iu përgjigjur, ndërtohet një grup
 * skenarësh ku përgjigjja e pyetjes ndodhet në një njësi të vetme të njohur, ndërsa buxheti
 * i tokenave nuk i nxë të gjitha njësitë. Matja kryesore është sa shpesh njësia e duhur
 * përfundon brenda përzgjedhjes.
 *
 * Skenarët janë të balancuar sipas kohës dhe radhës së njësisë së duhur, që asnjë qasje bazë
 * të mos favorizohet ose të mos dëmtohet nga ndërtimi i provës.
 */

export type ScenarioItemSpec = {
  id: string;
  source: ContextItem["source"];
  text: string;
  tokenCount: number;
  ageHours: number;
};

export type PrioritizationScenario = {
  id: string;
  query: string;
  goldItemId: string;
  goldSource: string;
  goldAge: string;
  goldPosition: string;
  kind?: string;
  answerSpans: string[];
  tokenBudget: number;
  items: ScenarioItemSpec[];
};

export type StrategyOutcome = {
  scenarioId: string;
  strategy: PrioritizationStrategy;
  goldSelected: boolean;
  goldRank: number | null;
  selectedCount: number;
  tokensUsed: number;
  tokenBudget: number;
};

export type StrategyMetrics = {
  strategy: PrioritizationStrategy;
  scenarios: number;
  goldSelectedRate: number;
  // Në skenarët me informacion konfliktual, thjesht përfshirja e njësisë së duhur nuk mjafton:
  // nëse brenda buxhetit hyn edhe njësia e zëvendësuar, konflikti nuk është zgjidhur. Prandaj
  // matet edhe sa shpesh njësia e duhur renditet e para.
  goldFirstRate: number;
  meanGoldRank: number | null;
  meanSelectedCount: number;
  meanUtilization: number;
  byAge: Record<string, number>;
  byPosition: Record<string, number>;
  byKind: Record<string, number>;
  byKindFirst: Record<string, number>;
};

const STRATEGIES: PrioritizationStrategy[] = ["pocketai", "truncation", "recency", "relevance"];

// Koha e njësive jepet si moshë në orë, që skenarët të mos varen nga data e ekzekutimit.
const toContextItems = (scenario: PrioritizationScenario, nowMs: number, embeddings?: Map<string, Float32Array>): ContextItem[] =>
  scenario.items.map((spec) => ({
    id: spec.id,
    source: spec.source,
    text: spec.text,
    tokenCount: spec.tokenCount,
    timestamp: new Date(nowMs - spec.ageHours * 3_600_000).toISOString(),
    embedding: embeddings?.get(spec.text),
  }));

export const runScenario = (
  scenario: PrioritizationScenario,
  strategy: PrioritizationStrategy,
  nowMs: number,
  embeddings?: Map<string, Float32Array>,
  queryEmbedding?: Float32Array,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): StrategyOutcome => {
  const candidates = toContextItems(scenario, nowMs, embeddings);
  const result = prioritize({
    query: scenario.query,
    candidates,
    tokenBudget: scenario.tokenBudget,
    strategy,
    weights,
    now: nowMs,
    queryEmbedding,
  });
  const rank = result.selected.findIndex((item) => item.id === scenario.goldItemId);
  return {
    scenarioId: scenario.id,
    strategy,
    goldSelected: rank >= 0,
    goldRank: rank >= 0 ? rank + 1 : null,
    selectedCount: result.selected.length,
    tokensUsed: result.tokensUsed,
    tokenBudget: result.tokenBudget,
  };
};

const rate = (outcomes: StrategyOutcome[]) =>
  outcomes.length ? outcomes.filter((o) => o.goldSelected).length / outcomes.length : 0;

export const summarizeOutcomes = (
  outcomes: StrategyOutcome[],
  scenarios: PrioritizationScenario[],
): StrategyMetrics[] => {
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const groups = new Map<PrioritizationStrategy, StrategyOutcome[]>();
  for (const o of outcomes) {
    const list = groups.get(o.strategy);
    if (list) list.push(o);
    else groups.set(o.strategy, [o]);
  }

  const out: StrategyMetrics[] = [];
  for (const strategy of STRATEGIES) {
    const list = groups.get(strategy);
    if (!list || list.length === 0) continue;
    const ranks = list.map((o) => o.goldRank).filter((r): r is number => r !== null);
    const bucketBy = (pick: (s: PrioritizationScenario) => string, score: (l: StrategyOutcome[]) => number) => {
      const acc: Record<string, StrategyOutcome[]> = {};
      for (const o of list) {
        const s = byId.get(o.scenarioId);
        if (!s) continue;
        const key = pick(s);
        acc[key] = acc[key] ?? [];
        acc[key].push(o);
      }
      const res: Record<string, number> = {};
      for (const key of Object.keys(acc)) res[key] = Math.round(score(acc[key]) * 1000) / 1000;
      return res;
    };
    const firstRate = (l: StrategyOutcome[]) => (l.length ? l.filter((o) => o.goldRank === 1).length / l.length : 0);
    const bucketFirst = (pick: (s: PrioritizationScenario) => string) => bucketBy(pick, firstRate);
    const bucket = (pick: (s: PrioritizationScenario) => string) => {
      const acc: Record<string, StrategyOutcome[]> = {};
      for (const o of list) {
        const s = byId.get(o.scenarioId);
        if (!s) continue;
        const key = pick(s);
        acc[key] = acc[key] ?? [];
        acc[key].push(o);
      }
      const res: Record<string, number> = {};
      for (const key of Object.keys(acc)) res[key] = Math.round(rate(acc[key]) * 1000) / 1000;
      return res;
    };

    out.push({
      strategy,
      scenarios: list.length,
      goldSelectedRate: rate(list),
      goldFirstRate: list.length ? list.filter((o) => o.goldRank === 1).length / list.length : 0,
      meanGoldRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null,
      meanSelectedCount: list.reduce((a, o) => a + o.selectedCount, 0) / list.length,
      meanUtilization: list.reduce((a, o) => a + (o.tokenBudget ? o.tokensUsed / o.tokenBudget : 0), 0) / list.length,
      byAge: bucket((s) => s.goldAge),
      byPosition: bucket((s) => s.goldPosition),
      byKind: bucket((s) => s.kind ?? "n/a"),
      byKindFirst: bucketFirst((s) => s.kind ?? "n/a"),
    });
  }
  return out;
};

export const evaluatePrioritization = (
  scenarios: PrioritizationScenario[],
  nowMs: number,
  embeddings?: Map<string, Float32Array>,
  queryEmbeddings?: Map<string, Float32Array>,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
) => {
  const outcomes: StrategyOutcome[] = [];
  for (const scenario of scenarios) {
    for (const strategy of STRATEGIES) {
      outcomes.push(runScenario(scenario, strategy, nowMs, embeddings, queryEmbeddings?.get(scenario.query), weights));
    }
  }
  return { outcomes, metrics: summarizeOutcomes(outcomes, scenarios) };
};

export const PRIORITIZATION_STRATEGIES = STRATEGIES;
