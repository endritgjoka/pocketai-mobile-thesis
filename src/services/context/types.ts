export type ContextSourceKind = "chat" | "document" | "calendar" | "health";

export type PrioritizationStrategy = "pocketai" | "truncation" | "recency" | "relevance";

export interface ContextItem {
  id: string;
  source: ContextSourceKind;
  text: string;
  tokenCount: number;
  timestamp: string;
  embedding?: Float32Array;
  meta?: Record<string, unknown>;
}

export interface ScoringWeights {
  sourceWeights: Record<ContextSourceKind, number>;
  recencyHalfLifeHours: number;
  /**
   * Kufiri i poshtëm i faktorit të freskisë.
   *
   * Pa këtë kufi, informacioni i vjetër por i vlefshëm ndëshkohet pa nevojë: matjet e P4
   * treguan se njësia e duhur renditej e para vetëm në 37.5 përqind të rasteve kur ajo
   * ishte e vjetër, ndërsa relevanca e pastër arrinte 100 përqind. Vlera 0 riprodhon
   * sjelljen fillestare.
   */
  recencyFloor?: number;
}

export interface ScoredItem extends ContextItem {
  relevance: number;
  recency: number;
  sourceWeight: number;
  score: number;
}

export interface PrioritizationResult {
  strategy: PrioritizationStrategy;
  selected: ScoredItem[];
  rejected: Array<ScoredItem & { reason: "low_score" | "budget_exhausted" }>;
  tokenBudget: number;
  tokensUsed: number;
  scoringTimeMs: number;
  packingTimeMs: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  sourceWeights: { document: 1.0, chat: 0.8, calendar: 0.6, health: 0.4 },
  recencyHalfLifeHours: 24 * 7,
  // 0.7 u zgjodh nga një provë me njëmbëdhjetë vlera nga 0 deri në 1 mbi një nëngrup kalibrimi
  // prej 24 skenarësh, dhe u verifikua mbi një nëngrup të veçantë prej 24 skenarësh të tjerë që
  // nuk morën pjesë në zgjedhje. Me këtë vlerë freskia e modulon relevancën pa e anuluar atë,
  // çka ruan dallimin e informacionit të zëvendësuar dhe njëkohësisht nuk ndëshkon informacionin
  // e vjetër që nuk është zëvendësuar nga asgjë. Mbi nëngrupin e mbajtur mënjanë vlerat 0.5 dhe
  // 0.7 dalin të njëjta, prandaj zgjedhja qëndron mbi një brez të gjerë dhe jo mbi një pikë.
  recencyFloor: 0.7,
};
