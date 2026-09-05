import { RetrievalResult } from "../rag/retrieval";

/**
 * Vlerësimi i saktësisë së marrjes së informacionit (P3).
 *
 * Etiketimi manual i copave si të përshtatshme ose jo do të ishte i pamundur të mbahej i
 * qëndrueshëm kur madhësia e copave ndryshon: të njëjtat fjalë bien në copa të ndryshme për
 * 256, 512 dhe 1024 tokena. Prandaj përshtatshmëria përcaktohet nga përmbajtja: një copë
 * quhet e përshtatshme nëse përmban vetë përgjigjen. Kjo është qasja e njohur si
 * "answer-in-context" dhe lejon që i njëjti grup pyetjesh të përdoret për çdo copëzim.
 */

export type RetrievalGroundTruth = {
  id: string;
  question: string;
  // Vargjet që duhet të shfaqen në copën e marrë për ta quajtur atë të përshtatshme.
  answerSpans: string[];
};

export type RetrievalMetrics = {
  hit: boolean;
  recall: number;
  precision: number;
  reciprocalRank: number;
  firstRelevantRank: number | null;
  retrievedCount: number;
};

// Normalizim i lehtë: shkronja të vogla dhe hapësira të njësuara, pa hequr diakritikat,
// sepse teksti mund të jetë shqip dhe heqja e tyre do të prishte përputhjet.
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

export const evaluateRetrieval = (
  retrieved: RetrievalResult[],
  answerSpans: string[]
): RetrievalMetrics => {
  const spans = answerSpans.map(normalize).filter((s) => s.length > 0);
  const texts = retrieved.map((chunk) => normalize(chunk.text));

  if (spans.length === 0 || texts.length === 0) {
    return {
      hit: false, recall: 0, precision: 0, reciprocalRank: 0,
      firstRelevantRank: null, retrievedCount: retrieved.length,
    };
  }

  const isRelevant = (text: string) => spans.some((span) => text.includes(span));
  const relevantCount = texts.filter(isRelevant).length;

  const foundSpans = spans.filter((span) => texts.some((text) => text.includes(span)));
  const rankIndex = texts.findIndex(isRelevant);
  const firstRelevantRank = rankIndex >= 0 ? rankIndex + 1 : null;

  return {
    hit: firstRelevantRank !== null,
    recall: foundSpans.length / spans.length,
    precision: relevantCount / texts.length,
    reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
    firstRelevantRank,
    retrievedCount: texts.length,
  };
};

// Mesatarja e metrikave mbi disa pyetje. MRR është pikërisht mesatarja e reciprocal rank.
export const averageRetrievalMetrics = (all: RetrievalMetrics[]) => {
  if (all.length === 0) {
    return { hitRate: 0, recallAtK: 0, precisionAtK: 0, mrr: 0, questionCount: 0 };
  }
  const sum = (pick: (m: RetrievalMetrics) => number) => all.reduce((acc, m) => acc + pick(m), 0);
  return {
    hitRate: sum((m) => (m.hit ? 1 : 0)) / all.length,
    recallAtK: sum((m) => m.recall) / all.length,
    precisionAtK: sum((m) => m.precision) / all.length,
    mrr: sum((m) => m.reciprocalRank) / all.length,
    questionCount: all.length,
  };
};
