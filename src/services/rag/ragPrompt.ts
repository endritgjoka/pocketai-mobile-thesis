import { RetrievalResult } from "./retrieval";

export const buildRagPrompt = (documentTitle: string, question: string, chunks: RetrievalResult[]) => {
  const context = chunks.map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.text}`).join("\n\n");
  return [
    {
      role: "user" as const,
      content:
        "Use only the provided document context when possible. If the answer is not present in the context, say that the document context is insufficient. Cite chunk numbers in your answer.\n\n" +
        `Document: ${documentTitle}\n\nContext:\n${context || "No sufficiently similar chunks were retrieved."}\n\nQuestion: ${question}`
    }
  ];
};
