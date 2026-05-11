export const toUserMessage = (error: unknown, fallback = "Something went wrong.") =>
  error instanceof Error && error.message ? error.message : fallback;

export const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
