import { calendarRepository } from "../../repositories/calendarRepository";
import { chatRepository } from "../../repositories/chatRepository";
import { documentRepository } from "../../repositories/documentRepository";
import { healthRepository } from "../../repositories/healthRepository";
import { estimateTokens } from "../llm/tokenEstimate";
import { ContextItem } from "./types";

export interface GatherOptions {
  conversationId?: string | null;
  documentId?: string | null;
  includeChat?: boolean;
  includeDocument?: boolean;
  includeCalendar?: boolean;
  includeHealth?: boolean;
  chatHistoryLimit?: number;
}

const safeTokenCount = (text: string, recorded?: number | null) => {
  if (recorded && recorded > 0) return recorded;
  return estimateTokens(text);
};

const gatherChat = async (conversationId: string, limit: number): Promise<ContextItem[]> => {
  const messages = await chatRepository.listMessages(conversationId);
  return messages.slice(-limit).map((m) => ({
    id: m.id,
    source: "chat",
    text: `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
    tokenCount: safeTokenCount(m.content, m.tokenCount),
    timestamp: m.createdAt,
    meta: { role: m.role },
  }));
};

const gatherDocument = async (documentId: string): Promise<ContextItem[]> => {
  const chunks = await documentRepository.getChunks(documentId);
  return chunks.map((c) => ({
    id: c.id,
    source: "document",
    text: c.text,
    tokenCount: c.tokenCount,
    timestamp: c.createdAt,
    embedding: c.embedding ?? undefined,
    meta: { chunkIndex: c.chunkIndex, documentId: c.documentId },
  }));
};

const gatherCalendar = async (): Promise<ContextItem[]> => {
  const events = await calendarRepository.getTodayEvents();
  return events.map((e) => {
    const when = new Date(e.startDate).toLocaleString();
    const text = `${e.title}${e.location ? ` @ ${e.location}` : ""} (${when})${e.notes ? ` — ${e.notes}` : ""}`;
    return {
      id: e.id,
      source: "calendar",
      text,
      tokenCount: estimateTokens(text),
      timestamp: e.startDate,
      meta: { calendarTitle: e.calendarTitle, allDay: e.allDay },
    };
  });
};

const gatherHealth = async (): Promise<ContextItem[]> => {
  const snap = await healthRepository.getLatestSnapshot();
  if (!snap) return [];
  const parts: string[] = [];
  if (snap.stepsToday !== null) parts.push(`steps today: ${snap.stepsToday}`);
  if (snap.stepsYesterday !== null) parts.push(`steps yesterday: ${snap.stepsYesterday}`);
  if (snap.sleepHoursLastNight !== null) parts.push(`sleep last night: ${snap.sleepHoursLastNight}h`);
  if (snap.averageHeartRate !== null) parts.push(`avg heart rate: ${snap.averageHeartRate} bpm`);
  if (parts.length === 0) return [];
  const text = parts.join(", ");
  return [
    {
      id: snap.id,
      source: "health",
      text,
      tokenCount: estimateTokens(text),
      timestamp: snap.updatedAt,
      meta: { date: snap.date, source: snap.source },
    },
  ];
};

export const gatherCandidates = async (options: GatherOptions): Promise<ContextItem[]> => {
  const items: ContextItem[] = [];
  const tasks: Promise<ContextItem[]>[] = [];
  if (options.includeChat && options.conversationId) {
    tasks.push(gatherChat(options.conversationId, options.chatHistoryLimit ?? 30));
  }
  if (options.includeDocument && options.documentId) {
    tasks.push(gatherDocument(options.documentId));
  }
  if (options.includeCalendar) tasks.push(gatherCalendar());
  if (options.includeHealth) tasks.push(gatherHealth());
  const results = await Promise.all(tasks);
  for (const bucket of results) items.push(...bucket);
  return items;
};
