// Konvertimet e vetme "burim i së vërtetës" nga statuset e brendshme (enum) në etiketa njerëzore.
// Përdoret nga çdo ekran/komponent që shfaq status, në mënyrë që i njëjti status të duket njësoj kudo.

export const capitalizeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  imported: "Imported",
  extracting: "Extracting",
  chunked: "Chunked",
  indexed: "Indexed",
  ready: "Ready",
  failed: "Failed"
};

export const documentStatusLabel = (status: string) => DOCUMENT_STATUS_LABELS[status] ?? capitalizeLabel(status);

const MODEL_DOWNLOAD_STATUS_LABELS: Record<string, string> = {
  idle: "Not downloaded",
  downloading: "Downloading",
  completed: "Downloaded",
  failed: "Failed"
};

export const modelDownloadStatusLabel = (status: string) => MODEL_DOWNLOAD_STATUS_LABELS[status] ?? capitalizeLabel(status);
