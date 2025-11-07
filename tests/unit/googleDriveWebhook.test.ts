import { describe, it, expect } from 'vitest';

import { googleDriveWebhookHandler } from '../../src/routes/googleDriveWebhook.js';
import { RouteContext } from '../../src/routes/types.js';
import { AppServices, IngestionRequest } from '../../src/services/types.js';
import { createMockRequest, createMockResponse } from '../../src/testing/httpMocks.js';
import { AppConfig } from '../../src/utils/config.js';
import { createLogger } from '../../src/utils/logger.js';

function createTestConfig(): AppConfig {
  return {
    env: 'test',
    host: '0.0.0.0',
    port: 8080,
    googleDrive: {
      watchFolderId: undefined,
      webhookVerificationSecret: 'secret-token',
      serviceAccountEmail: undefined,
      serviceAccountKey: undefined,
      pubsubTopic: undefined,
    },
    supabase: {
      url: undefined,
      serviceRoleKey: undefined,
      anonKey: undefined,
      schema: 'public',
      documentTable: 'documents',
      chunkTable: 'document_chunks',
      matchFunction: 'match_document_chunks',
      embeddingDimensions: 1536,
    },
    embeddings: {
      provider: 'openai',
      openai: {
        apiKey: undefined,
        model: 'text-embedding-3-small',
      },
    },
    ingestionQueueName: 'test-queue',
  };
}

describe('Google Drive Webhook Handler', () => {
  it('rejects webhook requests with invalid verification token', async () => {
    const config = createTestConfig();
    const logger = createLogger(config.env);
    const enqueueCalls: IngestionRequest[] = [];
    const services = createMockServices(enqueueCalls);

    const req = createMockRequest({ 'x-goog-channel-token': 'wrong' });
    const { response, state } = createMockResponse();
    const context: RouteContext = {
      req,
      res: response,
      config,
      services,
      body: { fileId: '123' },
      searchParams: new URLSearchParams(),
      logger,
    };

    await googleDriveWebhookHandler(context);

    expect(state.statusCode).toBe(401);
    expect(JSON.parse(state.body)).toEqual({ error: 'invalid_token' });
    expect(enqueueCalls.length).toBe(0);
  });

  it('enqueues ingestion when payload contains fileId', async () => {
    const config = createTestConfig();
    const logger = createLogger(config.env);
    const enqueueCalls: IngestionRequest[] = [];
    const services = createMockServices(enqueueCalls);

    const req = createMockRequest({ 'x-goog-channel-token': 'secret-token' });
    const { response, state } = createMockResponse();
    const context: RouteContext = {
      req,
      res: response,
      config,
      services,
      body: { fileId: 'abc123' },
      searchParams: new URLSearchParams(),
      logger,
    };

    await googleDriveWebhookHandler(context);

    expect(state.statusCode).toBe(202);
    expect(enqueueCalls.length).toBe(1);
    expect(enqueueCalls[0]?.fileId).toBe('abc123');
    expect(JSON.parse(state.body)).toEqual({ accepted: true, fileId: 'abc123' });
  });
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
