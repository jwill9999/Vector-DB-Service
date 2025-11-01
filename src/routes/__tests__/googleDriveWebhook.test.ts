import assert from "node:assert/strict";
import test from "node:test";

import { AppConfig } from "../../config.js";
import { googleDriveWebhookHandler } from "../googleDriveWebhook.js";
import { RouteContext } from "../types.js";
import { AppServices, IngestionRequest } from "../../services/types.js";
import { createMockRequest, createMockResponse } from "../../testing/httpMocks.js";

function createTestConfig(): AppConfig {
  return {
    env: "test",
    host: "0.0.0.0",
    port: 8080,
    googleDrive: {
      watchFolderId: undefined,
      webhookVerificationSecret: "secret-token",
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
}

test("rejects webhook requests with invalid verification token", async () => {
  const config = createTestConfig();
  const enqueueCalls: IngestionRequest[] = [];
  const services = createMockServices(enqueueCalls);

  const req = createMockRequest({ "x-goog-channel-token": "wrong" });
  const { response, state } = createMockResponse();
  const context: RouteContext = {
    req,
    res: response,
    config,
    services,
    body: { fileId: "123" },
    searchParams: new URLSearchParams(),
  };

  await googleDriveWebhookHandler(context);

  assert.equal(state.statusCode, 401);
  assert.deepEqual(JSON.parse(state.body), { error: "invalid_token" });
  assert.equal(enqueueCalls.length, 0);
});

test("enqueues ingestion when payload contains fileId", async () => {
  const config = createTestConfig();
  const enqueueCalls: IngestionRequest[] = [];
  const services = createMockServices(enqueueCalls);

  const req = createMockRequest({ "x-goog-channel-token": "secret-token" });
  const { response, state } = createMockResponse();
  const context: RouteContext = {
    req,
    res: response,
    config,
    services,
    body: { fileId: "abc123" },
    searchParams: new URLSearchParams(),
  };

  await googleDriveWebhookHandler(context);

  assert.equal(state.statusCode, 202);
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0]?.fileId, "abc123");
  assert.deepEqual(JSON.parse(state.body), { accepted: true, fileId: "abc123" });
});

function createMockServices(enqueueCalls: IngestionRequest[]): AppServices {
  return {
    ingestion: {
      async enqueue(request: IngestionRequest) {
        enqueueCalls.push(request);
      },
    },
    embeddings: {
      async embedText() {
        return [];
      },
    },
    vectorStore: {
      async upsertDocument() {},
      async upsertChunks() {},
      async deleteDocumentChunks() {},
      async queryByVector() {
        return [];
      },
    },
  };
}
