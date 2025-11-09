import { randomUUID } from "node:crypto";

import { describe, it, expect } from "vitest";

import { createSupabaseVectorStore } from "../../src/services/supabase/vectorStore.js";
import { AppConfig } from "../../src/utils/config.js";
import { createLogger } from "../../src/utils/logger.js";

const parsedDimension = process.env.SUPABASE_EMBEDDING_DIMENSIONS
  ? Number.parseInt(process.env.SUPABASE_EMBEDDING_DIMENSIONS, 10)
  : undefined;
const dimension = Number.isFinite(parsedDimension ?? Number.NaN)
  ? (parsedDimension as number)
  : 1536;
const restUrl = process.env.SUPABASE_URL;
const directUrl = process.env.SUPABASE_DIRECT_URL;
const missingEnv = !restUrl && !directUrl;

const integrationConfig: AppConfig = {
  env: "test",
  host: "0.0.0.0",
  port: 8080,
  googleDrive: {
    watchFolderId: undefined,
    webhookVerificationSecret: undefined,
    serviceAccountEmail: undefined,
    serviceAccountKey: undefined,
    pubsubTopic: undefined,
  },
  supabase: {
    url: restUrl,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    directUrl,
    anonKey: undefined,
    schema: process.env.SUPABASE_SCHEMA ?? "public",
    documentTable: process.env.SUPABASE_DOCUMENT_TABLE ?? "documents",
    chunkTable: process.env.SUPABASE_CHUNK_TABLE ?? "document_chunks",
    matchFunction: process.env.SUPABASE_MATCH_FUNCTION ?? "match_document_chunks",
    embeddingDimensions: dimension,
  },
  embeddings: {
    provider: "openai",
    openai: {
      apiKey: undefined,
      model: "text-embedding-3-small",
    },
  },
  ingestionQueueName: "test-queue",
};

describe.skipIf(missingEnv)("Supabase Vector Store Integration", () => {
  it("upserts and queries vectors successfully", async () => {
    const logger = createLogger(integrationConfig.env);
    const store = createSupabaseVectorStore(integrationConfig, logger);
    const documentId = randomUUID();

    await store.upsertDocument({
      documentId,
      title: "integration test document",
      source: "test",
      metadata: { note: "temporary" },
    });

    await store.deleteDocumentChunks(documentId);

    const embedding = buildTestEmbedding(dimension, 0.75);
    await store.upsertChunks([
      {
        documentId,
        chunkId: randomUUID(),
        content: "Sample chunk content for integration test.",
        source: "test",
        ordering: 0,
        embedding,
        metadata: { heading: { level: 1, text: "Heading" } },
      },
    ]);

    const results = await store.queryByVector(embedding, { limit: 1 });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.documentId).toBe(documentId);

    await store.deleteDocumentChunks(documentId);
  });
});

describe("Supabase Vector Store Fallback", () => {
  it("handles missing credentials gracefully", async () => {
    const logger = createLogger(integrationConfig.env);
    const store = createSupabaseVectorStore(
      {
        ...integrationConfig,
        supabase: {
          ...integrationConfig.supabase,
          url: undefined,
          serviceRoleKey: undefined,
          directUrl: undefined,
        },
      },
      logger
    );

    await expect(
      store.upsertDocument({
        documentId: randomUUID(),
        title: "noop",
        source: "test",
      })
    ).resolves.not.toThrow();

    const results = await store.queryByVector(new Array(dimension).fill(0), { limit: 1 });
    expect(results.length).toBe(0);
  });
});

function buildTestEmbedding(dimensions: number, signal: number): number[] {
  const vector = new Array(dimensions).fill(0);
  vector[0] = signal;
  return vector;
}
