export const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.trim().length / 4));
