import * as FileSystem from "expo-file-system";
import { BertTokenizer } from "./tokenizer";
import { EMBEDDING_MODEL, EmbeddingModelInfo } from "./embeddingCatalog";

type InferenceSessionType = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array | BigInt64Array; dims: readonly number[] }>>;
  release?: () => Promise<void> | void;
};

type OrtModule = {
  InferenceSession: { create: (modelPath: string, options?: Record<string, unknown>) => Promise<InferenceSessionType> };
  Tensor: new (type: string, data: BigInt64Array | Float32Array, dims: number[]) => unknown;
};

const EMBED_DIM = 384;

const stripFilePrefix = (uri: string) => uri.replace(/^file:\/\//, "");

class PocketEmbeddingService {
  private ort: OrtModule | null = null;
  private session: InferenceSessionType | null = null;
  private tokenizer: BertTokenizer | null = null;
  private loadPromise: Promise<void> | null = null;
  private model: EmbeddingModelInfo = EMBEDDING_MODEL;

  isReady() {
    return Boolean(this.session && this.tokenizer);
  }

  async modelExists() {
    const dir = await this.modelDir();
    const modelInfo = await FileSystem.getInfoAsync(`${dir}${this.model.onnxFilename}`);
    const vocabInfo = await FileSystem.getInfoAsync(`${dir}${this.model.vocabFilename}`);
    return modelInfo.exists && vocabInfo.exists;
  }

  async modelDir() {
    const dir = `${FileSystem.documentDirectory ?? ""}embeddings/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    return dir;
  }

  async getOnnxPath() {
    return `${await this.modelDir()}${this.model.onnxFilename}`;
  }

  async getVocabPath() {
    return `${await this.modelDir()}${this.model.vocabFilename}`;
  }

  async unload() {
    await this.session?.release?.();
    this.session = null;
    this.tokenizer = null;
    this.loadPromise = null;
  }

  async load() {
    if (this.session && this.tokenizer) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const exists = await this.modelExists();
      if (!exists) throw new Error("Embedding model not downloaded yet.");
      const ortModule = (await import("onnxruntime-react-native")) as unknown as OrtModule;
      this.ort = ortModule;
      const modelPath = stripFilePrefix(await this.getOnnxPath());
      this.session = await ortModule.InferenceSession.create(modelPath);
      const vocabText = await FileSystem.readAsStringAsync(await this.getVocabPath(), { encoding: FileSystem.EncodingType.UTF8 });
      this.tokenizer = BertTokenizer.fromVocabText(vocabText, { maxLength: this.model.maxLength });
    })();
    try {
      await this.loadPromise;
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  }

  private buildTensors(inputIds: BigInt64Array, attentionMask: BigInt64Array, tokenTypeIds: BigInt64Array, seqLen: number) {
    if (!this.ort) throw new Error("ONNX runtime not initialised.");
    const dims = [1, seqLen];
    return {
      input_ids: new this.ort.Tensor("int64", inputIds, dims),
      attention_mask: new this.ort.Tensor("int64", attentionMask, dims),
      token_type_ids: new this.ort.Tensor("int64", tokenTypeIds, dims),
    };
  }

  private meanPool(hidden: Float32Array, attentionMask: BigInt64Array, seqLen: number, dim: number): Float32Array {
    const pooled = new Float32Array(dim);
    let count = 0;
    for (let i = 0; i < seqLen; i += 1) {
      if (attentionMask[i] === 0n) continue;
      count += 1;
      const base = i * dim;
      for (let j = 0; j < dim; j += 1) pooled[j] += hidden[base + j];
    }
    if (count === 0) return pooled;
    for (let j = 0; j < dim; j += 1) pooled[j] /= count;
    return pooled;
  }

  private l2Normalize(vec: Float32Array): Float32Array {
    let sum = 0;
    for (let i = 0; i < vec.length; i += 1) sum += vec[i] * vec[i];
    const norm = Math.sqrt(sum);
    if (norm === 0) return vec;
    const out = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i += 1) out[i] = vec[i] / norm;
    return out;
  }

  async embed(text: string): Promise<Float32Array> {
    await this.load();
    if (!this.session || !this.tokenizer) throw new Error("Embedding service not ready.");
    const encoded = this.tokenizer.encode(text);
    const seqLen = encoded.inputIds.length;
    const feeds = this.buildTensors(encoded.inputIds, encoded.attentionMask, encoded.tokenTypeIds, seqLen);
    const result = await this.session.run(feeds as unknown as Record<string, unknown>);
    const outputName = this.pickHiddenStateName(this.session.outputNames);
    const output = result[outputName];
    if (!output) throw new Error(`Expected output '${outputName}' from ONNX session.`);
    const hidden = output.data as Float32Array;
    const pooled = this.meanPool(hidden, encoded.attentionMask, seqLen, EMBED_DIM);
    return this.l2Normalize(pooled);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  private pickHiddenStateName(names: readonly string[]) {
    if (names.includes("last_hidden_state")) return "last_hidden_state";
    if (names.includes("sentence_embedding")) return "sentence_embedding";
    return names[0];
  }
}

export const EmbeddingService = new PocketEmbeddingService();

export const cosineSimilarityVec = (a: Float32Array, b: Float32Array) => {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Kodim dhe dekodim base64 i shkruar posaçërisht, pa Buffer.
// Buffer është global i Node.js dhe nuk ekziston në Hermes, prandaj përdorimi i tij bënte
// që ruajtja e embeddings të dështonte në pajisje dhe marrja e informacionit të kthehej
// pa u kuptuar te TF-IDF.
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const encodeFloat32 = (vec: Float32Array): string => {
  const bytes = new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : "=";
  }
  return out;
};

export const decodeFloat32 = (base64: string): Float32Array => {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = B64_CHARS.indexOf(clean[i + 2]);
    const c3 = B64_CHARS.indexOf(clean[i + 3]);
    if (byteIndex < byteLength) bytes[byteIndex++] = (c0 << 2) | (c1 >> 4);
    if (byteIndex < byteLength) bytes[byteIndex++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (byteIndex < byteLength) bytes[byteIndex++] = ((c2 & 3) << 6) | c3;
  }
  // Kopjohet në një buffer të vetin, që shtrirja të jetë e shumëfishtë e 4 bajtëve.
  const aligned = new Uint8Array(byteLength - (byteLength % 4));
  aligned.set(bytes.subarray(0, aligned.length));
  return new Float32Array(aligned.buffer);
};

export const EMBEDDING_DIM = EMBED_DIM;
