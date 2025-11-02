import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { AppConfig } from "../../../config.js";
import { createSupabaseVectorStore } from "../vectorStore.js";

const parsedDimension = process.env.SUPABASE_TEST_EMBEDDING_DIMENSIONS
  ? Number.parseInt(process.env.SUPABASE_TEST_EMBEDDING_DIMENSIONS, 10)
  : undefined;
const dimension = Number.isFinite(parsedDimension ?? Number.NaN)
  ? (parsedDimension as number)
  : 1536;
const restUrl = process.env.SUPABASE_TEST_URL;
const directUrl = process.env.SUPABASE_TEST_DIRECT_URL;
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
    serviceRoleKey: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY,
    directUrl,
    anonKey: undefined,
    schema: process.env.SUPABASE_TEST_SCHEMA ?? "public",
    documentTable: process.env.SUPABASE_TEST_DOCUMENT_TABLE ?? "documents",
    chunkTable: process.env.SUPABASE_TEST_CHUNK_TABLE ?? "document_chunks",
    matchFunction: process.env.SUPABASE_TEST_MATCH_FUNCTION ?? "match_document_chunks",
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

test("supabase vector store upsert and query", { skip: missingEnv }, async () => {
  const store = createSupabaseVectorStore(integrationConfig);
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

  assert.ok(results.length >= 1, "expected at least one result");
  assert.equal(results[0]?.documentId, documentId);

  await store.deleteDocumentChunks(documentId);
});

test("supabase vector store fallback when credentials missing", async () => {
  const store = createSupabaseVectorStore({
    ...integrationConfig,
    supabase: {
      ...integrationConfig.supabase,
      url: undefined,
      serviceRoleKey: undefined,
    },
  });

  await assert.doesNotReject(async () => {
    await store.upsertDocument({
      documentId: randomUUID(),
      title: "noop",
      source: "test",
    });
  });

  const results = await store.queryByVector(new Array(dimension).fill(0), { limit: 1 });
  assert.equal(results.length, 0);
});

function buildTestEmbedding(dimensions: number, signal: number): number[] {
  const vector = new Array(dimensions).fill(0);
  vector[0] = signal;
  return vector;
}
