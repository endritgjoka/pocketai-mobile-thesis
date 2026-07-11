// Metrikat ROUGE (pa varësi të jashtme) për vlerësimin e përmbledhjeve përkundër një përgjigjeje referencë.
// ROUGE-N (unigram/bigram) dhe ROUGE-L (nën-sekuenca më e gjatë e përbashkët). Kthen F1.

export interface RougeScores {
  rouge1: number;
  rouge2: number;
  rougeL: number;
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const ngrams = (tokens: string[], n: number): string[] => {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i += 1) out.push(tokens.slice(i, i + n).join(" "));
  return out;
};

const counter = (items: string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
};

const f1 = (precision: number, recall: number) => (precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall));

// ROUGE-N F1 me numërim të mbivendosjes së kufizuar (min i frekuencave).
const rougeN = (candidate: string[], reference: string[], n: number): number => {
  const cand = ngrams(candidate, n);
  const ref = ngrams(reference, n);
  if (cand.length === 0 || ref.length === 0) return 0;
  const refCount = counter(ref);
  const candCount = counter(cand);
  let overlap = 0;
  candCount.forEach((count, gram) => { overlap += Math.min(count, refCount.get(gram) ?? 0); });
  const precision = overlap / cand.length;
  const recall = overlap / ref.length;
  return f1(precision, recall);
};

// Gjatësia e nën-sekuencës më të gjatë të përbashkët (LCS) me hapësirë O(min).
const lcsLength = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) return 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
};

const rougeL = (candidate: string[], reference: string[]): number => {
  if (candidate.length === 0 || reference.length === 0) return 0;
  const lcs = lcsLength(candidate, reference);
  const precision = lcs / candidate.length;
  const recall = lcs / reference.length;
  return f1(precision, recall);
};

export const computeRouge = (candidate: string, reference: string): RougeScores => {
  const c = tokenize(candidate);
  const r = tokenize(reference);
  return {
    rouge1: rougeN(c, r, 1),
    rouge2: rougeN(c, r, 2),
    rougeL: rougeL(c, r),
  };
};
