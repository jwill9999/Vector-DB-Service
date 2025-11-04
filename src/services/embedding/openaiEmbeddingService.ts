import crypto from "node:crypto";

import OpenAI from "openai";

import { Logger } from "../../utils/logger.js";
import { EmbeddingService } from "../types.js";

export interface OpenAIEmbeddingOptions {
  apiKey?: string;
  model: string;
  dimensions: number;
}

const DEFAULT_BATCH_SIZE = 64;

export class OpenAIEmbeddingService implements EmbeddingService {
  private readonly client?: OpenAI;

  constructor(
    private readonly options: OpenAIEmbeddingOptions,
    private readonly logger: Logger
  ) {
    if (options.apiKey) {
      this.client = new OpenAI({ apiKey: options.apiKey });
    }
  }

  async embedText(input: string[]): Promise<number[][]> {
    if (!this.client) {
      this.logger.warn("OPENAI_API_KEY not set; returning deterministic placeholder embeddings.");
      // Non-production fallback: hashes input to stable vectors so tests can run without real API calls.
      return input.map((text) => this.generateDeterministicVector(text));
    }

    const embeddings: number[][] = [];
    for (let start = 0; start < input.length; start += DEFAULT_BATCH_SIZE) {
      const batch = input.slice(start, start + DEFAULT_BATCH_SIZE);
      if (batch.length === 0) {
        continue;
      }

      const response = await this.client.embeddings.create({
        model: this.options.model,
        input: batch,
        dimensions: this.options.dimensions,
      });

      for (const item of response.data) {
        embeddings.push(item.embedding);
      }
    }

    if (embeddings.length !== input.length) {
      throw new Error(
        `Embedding count mismatch: expected ${input.length} but received ${embeddings.length}`
      );
    }

    return embeddings;
  }

  private generateDeterministicVector(text: string): number[] {
    const bytesNeeded = this.options.dimensions;
    const vector: number[] = [];
    let seed = text;

    while (vector.length < bytesNeeded) {
      const hash = crypto.createHash("sha256").update(seed).digest();
      for (const byte of hash) {
        vector.push(byte / 255);
        if (vector.length === bytesNeeded) {
          break;
        }
      }
      seed = `${seed}:${vector.length}`;
    }

    return vector;
  }
}
