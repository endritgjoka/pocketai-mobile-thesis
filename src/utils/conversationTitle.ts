const cleanTrailing = (value: string) => value.replace(/[\s.!?;:,]+$/g, "");

export const generateConversationTitle = (firstUserMessage: string) => {
  const collapsed = firstUserMessage.replace(/\s+/g, " ").trim();
  if (!collapsed) return "New Chat";
  const withoutPrefix = collapsed.replace(/^(can you|could you|please|tell me|explain to me)\s+/i, "");
  const clipped = withoutPrefix.slice(0, 40).trim();
  const title = cleanTrailing(clipped) || cleanTrailing(collapsed.slice(0, 40)) || "New Chat";
  return title.charAt(0).toUpperCase() + title.slice(1);
};
