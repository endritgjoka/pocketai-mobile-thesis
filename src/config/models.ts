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
    id: "llama32-1b-q8",
    name: "Llama 3.2 1B Q8",
    modeLabel: "8-bit",
    filename: "llama-3.2-1b-instruct-q8.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q8_0.gguf",
    sizeLabel: "~1.3 GB",
    recommendedRam: "4GB+ RAM",
    description: "Same model as 1B Q4 at 8-bit — for the quantization-level comparison.",
    defaultContextSize: 2048
  },
  {
    id: "llama32-1b-q3",
    name: "Llama 3.2 1B Q3",
    modeLabel: "3-bit",
    filename: "llama-3.2-1b-instruct-q3.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q3_K_L.gguf",
    sizeLabel: "~0.68 GB",
    recommendedRam: "4GB+ RAM",
    description: "Lowest bit width in the sweep — expected quality loss, for the quantization curve.",
    defaultContextSize: 2048
  },
  {
    id: "llama32-1b-q5",
    name: "Llama 3.2 1B Q5",
    modeLabel: "5-bit",
    filename: "llama-3.2-1b-instruct-q5.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q5_K_M.gguf",
    sizeLabel: "~0.85 GB",
    recommendedRam: "4GB+ RAM",
    description: "Mid point between Q4 and Q8 on the quantization curve.",
    defaultContextSize: 2048
  },
  {
    id: "llama32-1b-q6",
    name: "Llama 3.2 1B Q6",
    modeLabel: "6-bit",
    filename: "llama-3.2-1b-instruct-q6.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q6_K.gguf",
    sizeLabel: "~0.95 GB",
    recommendedRam: "4GB+ RAM",
    description: "Near-lossless quantization, upper end of the curve before 8-bit.",
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
  },
  {
    id: "llama32-3b-q8",
    name: "Llama 3.2 3B Q8",
    modeLabel: "8-bit",
    filename: "llama-3.2-3b-instruct-q8.gguf",
    url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q8_0.gguf",
    sizeLabel: "~3.4 GB",
    recommendedRam: "8GB+ RAM",
    description: "Same model as 3B Q4 at 8-bit — heavier, for the quantization-level comparison.",
    defaultContextSize: 2048
  }
];
