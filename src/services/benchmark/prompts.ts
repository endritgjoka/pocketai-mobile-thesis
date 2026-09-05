// Bashkësia e pyetjeve për vlerësimin eksperimental.
//
// Një pyetje e vetme nuk mjafton për një vlerësim empirik: rezultatet do të varionin
// sipas rastit dhe nuk do të lejonin as mesatare, as devijim standard. Prandaj çdo
// konfigurim matet mbi disa pyetje, secila e përsëritur disa herë.

export type BenchPrompt = {
  id: string;
  text: string;
  // Kategoria lejon analizë të ndarë sipas llojit të detyrës në Kapitullin 6.
  category: "shpjegim" | "arsyetim" | "permbledhje" | "udhezim" | "gjenerim";
};

// Pyetje të përgjithshme bisede, të pavarura nga çdo dokument.
export const CHAT_PROMPTS: BenchPrompt[] = [
  { id: "chat-01", category: "shpjegim", text: "Explain quantization in large language models in simple terms." },
  { id: "chat-02", category: "shpjegim", text: "What is the difference between RAM and storage on a smartphone?" },
  { id: "chat-03", category: "arsyetim", text: "A train leaves at 14:20 and the journey takes 95 minutes. What time does it arrive? Explain your reasoning." },
  { id: "chat-04", category: "udhezim", text: "List exactly three advantages of running an AI model directly on a phone. Answer with a numbered list." },
  { id: "chat-05", category: "permbledhje", text: "Summarize in two sentences why smaller language models are useful on mobile devices." },
  { id: "chat-06", category: "gjenerim", text: "Write a short paragraph explaining to a beginner what an offline AI assistant is." },
];

// Pyetje mbi dokumente, të formuluara që të jenë të vlefshme për çdo dokument të ngarkuar.
export const DOC_PROMPTS: BenchPrompt[] = [
  { id: "doc-01", category: "permbledhje", text: "What is this document about? Answer using only the provided context." },
  { id: "doc-02", category: "udhezim", text: "List the main points stated in the provided context." },
  { id: "doc-03", category: "shpjegim", text: "Explain the most important idea in the provided context." },
];

// Sa herë përsëritet i njëjti konfigurim. Përsëritjet lejojnë llogaritjen e devijimit
// standard dhe zbutin ndikimin e ngarkesës së çastit të pajisjes.
export const DEFAULT_REPEATS = 3;

// Nënbashkësi më e vogël për teste të shpejta gjatë zhvillimit.
export const QUICK_CHAT_PROMPTS = CHAT_PROMPTS.slice(0, 2);
