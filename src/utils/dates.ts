export const nowIso = () => new Date().toISOString();

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
