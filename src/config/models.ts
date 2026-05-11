 import { ModelCatalogItem } from "../types";

export const MODEL_CATALOG: ModelCatalogItem[] = [
  {
    id: "phi3-mini-q4",
    name: "Phi-3 Mini Q4",
    modeLabel: "Light Mode",
    filename: "phi3-mini-q4.gguf",
    url: "https://sportix-prod-files-240939826524-eu-central-1-an.s3.eu-central-1.amazonaws.com/Phi-3-mini-4k-instruct-q4.gguf",
    sizeLabel: "~2.2 GB",
    recommendedRam: "6GB+ RAM",
    description: "Faster responses and lower memory usage.",
    defaultContextSize: 2048
  },
  {
    id: "llama32-3b-q4",
    name: "Llama 3.2 3B Q4",
    modeLabel: "Full Mode",
    filename: "llama-3.2-3b-q4.gguf",
    url: "https://sportix-prod-files-240939826524-eu-central-1-an.s3.eu-central-1.amazonaws.com/Phi-3-mini-4k-instruct-q4.gguf",
    sizeLabel: "~2.0 GB",
    recommendedRam: "8GB+ RAM",
    description: "Better reasoning and richer responses.",
    defaultContextSize: 2048
  }
];
