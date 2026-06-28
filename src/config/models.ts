import { ModelCatalogItem } from "../types";

export const MODEL_CATALOG: ModelCatalogItem[] = [
  {
    id: "llama32-1b-q4",
    name: "Llama 3.2 1B Q4",
    modeLabel: "Tiny Mode",
    filename: "llama-3.2-1b-instruct-q4.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    sizeLabel: "~0.77 GB",
    recommendedRam: "4GB+ RAM",
    description: "Smallest baseline — fastest inference, lowest quality.",
    defaultContextSize: 2048
  },
  {
    id: "phi3-mini-q4",
    name: "Phi-3 Mini Q4",
    modeLabel: "Light Mode",
    filename: "phi3-mini-4k-instruct-q4.gguf",
    url: "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
    sizeLabel: "~2.2 GB",
    recommendedRam: "6GB+ RAM",
    description: "Different architecture (Phi family) — mid tier.",
    defaultContextSize: 2048
  },
  {
    id: "llama32-3b-q4",
    name: "Llama 3.2 3B Q4",
    modeLabel: "Full Mode",
    filename: "llama-3.2-3b-instruct-q4.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    sizeLabel: "~2.0 GB",
    recommendedRam: "8GB+ RAM",
    description: "Larger Llama — best reasoning of the three.",
    defaultContextSize: 2048
  }
];
