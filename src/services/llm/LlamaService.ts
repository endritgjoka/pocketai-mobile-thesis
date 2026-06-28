import { MODEL_CATALOG } from "../../config/models";
import { settingsRepository } from "../../repositories/settingsRepository";
import { InferenceStats, Message, ModelId } from "../../types";
import { toUserMessage } from "../../utils/errors";
import { buildPrioritizedPrompt, BuildPromptOptions, PrioritizationResult } from "../context";
import { ModelFileService } from "../models/ModelFileService";
import { buildChatPromptFor, cleanGeneratedText, stopTokensFor } from "./promptTemplates";
import { estimateTokens } from "./tokenEstimate";

type LlamaContext = {
  completion?: (params: Record<string, unknown>, callback?: (data: { token?: string }) => void) => Promise<{ text?: string; content?: string; timings?: unknown }>;
  release?: () => Promise<void> | void;
};

type GenerateOptions = {
  modelId: ModelId;
  messages: Pick<Message, "role" | "content">[];
  systemPrompt?: string;
  contextSize: number;
  temperature: number;
  topP: number;
  maxTokens: number;
  useMockInference: boolean;
  onToken?: (token: string) => void;
  shouldStop?: () => boolean;
};

type GenerateResult = {
  text: string;
  stats: InferenceStats;
  stopped?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class PocketLlamaService {
  private context: LlamaContext | null = null;
  private loadedModelId: ModelId | null = null;
  private loadedContextSize: number | null = null;
  private operationQueue: Promise<void> = Promise.resolve();

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.operationQueue.catch(() => undefined).then(task);
    this.operationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async hasModel(modelId: ModelId) {
    return ModelFileService.modelExists(modelId);
  }

  async unload() {
    await this.context?.release?.();
    this.context = null;
    this.loadedModelId = null;
    this.loadedContextSize = null;
  }

  async loadModel(modelId: ModelId, contextSize: number) {
    return this.runExclusive(() => this.loadModelInternal(modelId, contextSize));
  }

  private async loadModelInternal(modelId: ModelId, contextSize: number) {
    if (this.context && this.loadedModelId === modelId && this.loadedContextSize === contextSize) return 0;
    const started = Date.now();
    await this.unload();
    const modelPath = await ModelFileService.getLocalModelPath(modelId);
    const exists = await ModelFileService.modelExists(modelId);
    if (!exists) throw new Error("The selected model is not downloaded.");

    try {
      const llama = await import("llama.rn");
      const initLlama = (llama as unknown as { initLlama?: (params: Record<string, unknown>) => Promise<LlamaContext> }).initLlama;
      if (!initLlama) throw new Error("llama.rn initLlama API was not found.");
      this.context = await initLlama({ model: modelPath, n_ctx: contextSize, use_mlock: true });
      this.loadedModelId = modelId;
      this.loadedContextSize = contextSize;
      return Date.now() - started;
    } catch (error) {
      throw new Error(`Unable to load local model: ${toUserMessage(error)}`);
    }
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    return this.generateChatCompletion(options);
  }

  async generateChatCompletion(options: GenerateOptions): Promise<GenerateResult> {
    return this.runExclusive(() => this.generateInternal(options));
  }

  private async emitVisual(text: string, onToken?: (token: string) => void, shouldStop?: () => boolean) {
    if (!onToken) return { text, stopped: false };
    let emitted = "";
    for (let index = 0; index < text.length; index += 8) {
      if (shouldStop?.()) return { text: emitted.trim(), stopped: true };
      const chunk = text.slice(index, index + 8);
      emitted += chunk;
      onToken(chunk);
      await sleep(10);
    }
    return { text, stopped: false };
  }

  private async generateInternal(options: GenerateOptions): Promise<GenerateResult> {
    const prompt = buildChatPromptFor(options.modelId, options.messages, options.systemPrompt);
    const promptTokens = estimateTokens(prompt);
    const catalogItem = MODEL_CATALOG.find((item) => item.id === options.modelId);

    if (options.useMockInference) {
      const started = Date.now();
      const text = `[Mock inference] ${catalogItem?.name ?? options.modelId} would answer locally after loading the GGUF model. Disable mock inference in Settings for real llama.rn execution.`;
      const visual = await this.emitVisual(text, options.onToken, options.shouldStop);
      const totalTimeMs = Date.now() - started + 150;
      const outputTokens = estimateTokens(visual.text);
      return {
        text: visual.text,
        stopped: visual.stopped,
        stats: { totalTimeMs, loadTimeMs: 0, promptTokens, outputTokens, tokensPerSecond: outputTokens / (totalTimeMs / 1000), contextSize: options.contextSize, temperature: options.temperature, topP: options.topP }
      };
    }

    const loadTimeMs = await this.loadModelInternal(options.modelId, options.contextSize);
    if (!this.context?.completion) throw new Error("The llama.rn context does not expose a completion method in this runtime.");

    const started = Date.now();
    let streamed = "";
    let sawLiveToken = false;
    const result = await this.context.completion(
      { prompt, n_predict: options.maxTokens, temperature: options.temperature, top_p: options.topP, stop: stopTokensFor(options.modelId) },
      (data) => {
        if (data.token && !options.shouldStop?.()) {
          sawLiveToken = true;
          streamed += data.token;
          options.onToken?.(data.token);
        }
      }
    );
    let text = cleanGeneratedText(streamed || result.text || result.content || "");
    let stopped = Boolean(options.shouldStop?.());
    if (!sawLiveToken && text) {
      const visual = await this.emitVisual(text, options.onToken, options.shouldStop);
      text = visual.text;
      stopped = visual.stopped;
    }
    const totalTimeMs = Date.now() - started;
    const outputTokens = estimateTokens(text);
    return {
      text,
      stopped,
      stats: { totalTimeMs, loadTimeMs, promptTokens, outputTokens, tokensPerSecond: totalTimeMs > 0 ? outputTokens / (totalTimeMs / 1000) : null, contextSize: options.contextSize, temperature: options.temperature, topP: options.topP }
    };
  }

  async generateWithCurrentSettings(messages: Pick<Message, "role" | "content">[], onToken?: (token: string) => void, shouldStop?: () => boolean) {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select and download a model before running inference.");
    return this.generateChatCompletion({ modelId: settings.activeModelId, messages, contextSize: settings.contextSize, temperature: settings.temperature, topP: settings.topP, maxTokens: settings.maxTokens, useMockInference: settings.useMockInference, onToken, shouldStop });
  }

  async generateWithPrioritizedContext(
    contextOptions: BuildPromptOptions,
    onToken?: (token: string) => void,
    shouldStop?: () => boolean,
  ): Promise<GenerateResult & { prioritization: PrioritizationResult; candidatesConsidered: number }> {
    const settings = await settingsRepository.getSettings();
    if (!settings.activeModelId) throw new Error("Select and download a model before running inference.");
    const built = await buildPrioritizedPrompt(contextOptions);
    const result = await this.generateChatCompletion({
      modelId: settings.activeModelId,
      messages: built.messages,
      systemPrompt: built.systemPromptWithContext,
      contextSize: settings.contextSize,
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: settings.maxTokens,
      useMockInference: settings.useMockInference,
      onToken,
      shouldStop,
    });
    return { ...result, prioritization: built.prioritization, candidatesConsidered: built.candidatesConsidered };
  }
}

export const LlamaService = new PocketLlamaService();
