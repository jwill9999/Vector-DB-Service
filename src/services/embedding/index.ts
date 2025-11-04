import { AppConfig } from "../../utils/config.js";
import { EmbeddingService } from "../types.js";

import { OpenAIEmbeddingService } from "./openaiEmbeddingService.js";

class ZeroVectorEmbeddingService implements EmbeddingService {
  constructor(private readonly dimensions: number) {}

  async embedText(input: string[]): Promise<number[][]> {
    return input.map(() => new Array(this.dimensions).fill(0));
  }
}

export function createEmbeddingService(config: AppConfig): EmbeddingService {
  const dimensions = config.supabase.embeddingDimensions;

  if (config.embeddings.provider === "openai") {
    return new OpenAIEmbeddingService({
      apiKey: config.embeddings.openai.apiKey,
      model: config.embeddings.openai.model,
      dimensions,
    });
  }

  console.warn(
    `Unknown embedding provider "${config.embeddings.provider}"; using zero-vector stub.`
  );
  return new ZeroVectorEmbeddingService(dimensions);
}
