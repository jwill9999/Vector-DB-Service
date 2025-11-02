import assert from "node:assert/strict";
import test from "node:test";

import { AppConfig } from "../../config.js";
import { searchHandler } from "../search.js";
import { RouteContext } from "../types.js";
import { AppServices } from "../../services/types.js";
import { createMockRequest, createMockResponse } from "../../testing/httpMocks.js";

const BASE_CONFIG: AppConfig = {
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
    url: undefined,
    serviceRoleKey: undefined,
    anonKey: undefined,
    schema: "public",
    documentTable: "documents",
    chunkTable: "document_chunks",
    matchFunction: "match_document_chunks",
    embeddingDimensions: 1536,
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

test("returns 400 when query is missing", async () => {
  const services = createMockServices([], []);
  const req = createMockRequest();
  const { response, state } = createMockResponse();
  const context: RouteContext = {
    req,
    res: response,
    config: BASE_CONFIG,
    services,
    body: {},
    searchParams: new URLSearchParams(),
  };

  await searchHandler(context);

  assert.equal(state.statusCode, 400);
  assert.deepEqual(JSON.parse(state.body), { error: "missing_query" });
});

test("embeds query and returns vector results", async () => {
  const embeddings: number[][] = [[0.1, 0.2, 0.3]];
  const results = [
    {
      chunkId: "chunk-1",
      documentId: "doc-1",
      content: "Chunk content",
      score: 0.9,
      metadata: { title: "Doc" },
    },
  ];

  const services = createMockServices(embeddings, results);
  const req = createMockRequest();
  const { response, state } = createMockResponse();
  const context: RouteContext = {
    req,
    res: response,
    config: BASE_CONFIG,
    services,
    body: { query: "hello world", limit: 1 },
    searchParams: new URLSearchParams(),
  };

  await searchHandler(context);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(JSON.parse(state.body), { results });
});

function createMockServices(embeddings: number[][], queryResults: unknown[]): AppServices {
  return {
    ingestion: {
      async enqueue() {
        throw new Error("not implemented");
      },
    },
    embeddings: {
      async embedText() {
        return embeddings;
      },
    },
    vectorStore: {
      async upsertDocument() {},
      async upsertChunks() {},
      async deleteDocumentChunks() {},
      async queryByVector() {
        return queryResults as never;
      },
    },
  };
}
