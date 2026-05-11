import { Message } from "../../types";

export const DEFAULT_SYSTEM_PROMPT =
  "You are PocketAI, a private on-device assistant. Be clear, concise, and helpful. If context is provided from a document, answer using that context and say when the context is insufficient.";

export const buildChatPrompt = (messages: Pick<Message, "role" | "content">[], systemPrompt = DEFAULT_SYSTEM_PROMPT) => {
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`)
    .join("\n\n");
  return `System: ${systemPrompt}\n\n${turns}\n\nAssistant:`;
};
