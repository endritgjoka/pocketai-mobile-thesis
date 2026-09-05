export interface EmbeddingModelInfo {
  id: "minilm-l6-v2";
  name: string;
  description: string;
  dim: number;
  maxLength: number;
  onnxFilename: string;
  vocabFilename: string;
  onnxUrl: string;
  vocabUrl: string;
  onnxSizeLabel: string;
  recommendedRam: string;
}

export const EMBEDDING_MODEL: EmbeddingModelInfo = {
  id: "minilm-l6-v2",
  name: "all-MiniLM-L6-v2 (ONNX)",
  description: "Sentence-Transformers embedding model. 384-dim semantic embeddings for RAG and context scoring.",
  dim: 384,
  // Dritarja e tokenizimit. Modeli all-MiniLM-L6-v2 është projektuar për 256 tokena
  // (max_seq_length zyrtar), prandaj përdoret kjo vlerë. Me 128 tokena, copat e madhësisë
  // 512 dhe 1024 do të përfaqësohesin vetëm nga fillimi i tekstit, çka do të shtrembëronte
  // krahasimin e madhësisë së copave: copat e mëdha do të penalizoheshin nga cungimi i
  // embeddings dhe jo nga copëzimi në vetvete.
  maxLength: 256,
  onnxFilename: "minilm-l6-v2.onnx",
  vocabFilename: "minilm-l6-v2-vocab.txt",
  onnxUrl: "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx",
  vocabUrl: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/vocab.txt",
  onnxSizeLabel: "~23 MB",
  recommendedRam: "Negligible",
};
