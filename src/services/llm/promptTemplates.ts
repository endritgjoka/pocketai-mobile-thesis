import { Message, ModelId } from "../../types";

export const DEFAULT_SYSTEM_PROMPT =
  "You are PocketAI, a private on-device assistant. Answer clearly and concisely. When document context is provided, base your answer on it and say plainly if the context does not contain the answer. Reply with a single answer only; never invent extra turns, questions, or a continued conversation.";

type ModelFamily = "phi3" | "llama3";

const familyFor = (modelId: ModelId): ModelFamily => (modelId.startsWith("phi3") ? "phi3" : "llama3");

type ChatMessage = Pick<Message, "role" | "content">;

// Tokenët ku gjenerimi duhet të ndalojë, sipas familjes së modelit.
export const stopTokensFor = (modelId: ModelId): string[] => {
  if (familyFor(modelId) === "phi3") return ["<|end|>", "<|user|>", "<|system|>"];
  return ["<|eot_id|>", "<|start_header_id|>"];
};

// Ndërton prompt-in sipas shabllonit vendas të modelit (Phi-3 ose Llama 3), që modeli të dijë ku të ndalojë.
export const buildChatPromptFor = (
  modelId: ModelId,
  messages: ChatMessage[],
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
): string => {
  const turns = messages.filter((m) => m.role !== "system");
  if (familyFor(modelId) === "phi3") {
    let p = `<|system|>\n${systemPrompt}<|end|>\n`;
    for (const m of turns) {
      const role = m.role === "user" ? "user" : "assistant";
      p += `<|${role}|>\n${m.content.trim()}<|end|>\n`;
    }
    p += "<|assistant|>\n";
    return p;
  }
  let p = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`;
  for (const m of turns) {
    const role = m.role === "user" ? "user" : "assistant";
    p += `<|start_header_id|>${role}<|end_header_id|>\n\n${m.content.trim()}<|eot_id|>`;
  }
  p += "<|start_header_id|>assistant<|end_header_id|>\n\n";
  return p;
};

// Pastron çdo artefakt të shabllonit ose rrjedhje të kthesave nga teksti i gjeneruar.
export const cleanGeneratedText = (raw: string): string => {
  let text = raw;
  // hiq tokenët e shabllonit
  text = text.replace(/<\|[^|]*\|>/g, "");
  // preje te shenja e parë e një kthese të re që modeli mund ta ketë halucinuar
  const cutMarkers = [/\n\s*User:/i, /\n\s*Assistant:/i, /\n\s*System:/i, /\n\s*Context:/i, /\n\s*Question:/i, /\n\s*Document:/i];
  for (const marker of cutMarkers) {
    const m = text.match(marker);
    if (m && m.index !== undefined) text = text.slice(0, m.index);
  }
  return text.trim();
};

// Ruajtur për pajtueshmëri (përdoret vetëm për vlerësim të përafërt të tokenave kur s'ka modelId).
export const buildChatPrompt = (messages: ChatMessage[], systemPrompt = DEFAULT_SYSTEM_PROMPT) => {
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`)
    .join("\n\n");
  return `System: ${systemPrompt}\n\n${turns}\n\nAssistant:`;
};
