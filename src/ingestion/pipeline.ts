import { randomUUID } from "node:crypto";

import { AppConfig } from "../config.js";
import { GoogleDocumentFetcher } from "../google/docsService.js";
import { chunkDocument } from "./chunk.js";
import {
  EmbeddingService,
  IngestionPipeline,
  IngestionRequest,
  VectorStore,
} from "../services/types.js";

const SOURCE_GOOGLE_DOCS = "google-docs";

class BasicIngestionPipeline implements IngestionPipeline {
  /**
   * Orchestrates the end-to-end ingest cycle for a Google Doc: fetch, chunk, embed,
   * and replace existing vectors in Supabase so search stays in sync.
   */
  constructor(
    private readonly config: AppConfig,
    private readonly docsFetcher: GoogleDocumentFetcher,
    private readonly embeddings: EmbeddingService,
    private readonly vectorStore: VectorStore
  ) {}

  async enqueue(request: IngestionRequest): Promise<void> {
    if (!request.fileId) {
      throw new Error("Ingestion request missing fileId");
    }

    const document = await this.docsFetcher.fetchDocument(request.fileId);
    const chunks = chunkDocument(document.segments);

    if (chunks.length === 0) {
      console.warn(`No ingestible text found for document ${document.documentId}`);
      await this.vectorStore.deleteDocumentChunks(document.documentId);
      return;
    }

    const sourceUri = buildGoogleDocUrl(document.documentId);

    await this.vectorStore.upsertDocument({
      documentId: document.documentId,
      title: document.title,
      source: SOURCE_GOOGLE_DOCS,
      metadata: {
        revisionId: document.revisionId,
        version: document.version,
        modifiedTime: document.modifiedTime,
        sourceUri,
      },
    });

    const embeddings = await this.embeddings.embedText(chunks.map((chunk) => chunk.content));
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch for document ${document.documentId}: expected ${chunks.length}, received ${embeddings.length}`
      );
    }

    const vectorChunks = chunks.map((chunk, index) => {
      const headingUri = chunk.heading?.id ? `${sourceUri}#heading=${chunk.heading.id}` : undefined;

      return {
        documentId: document.documentId,
        chunkId: randomUUID(),
        content: chunk.content,
        source: SOURCE_GOOGLE_DOCS,
        ordering: chunk.ordering,
        embedding: embeddings[index],
        metadata: {
          revisionId: document.revisionId,
          version: document.version,
          modifiedTime: document.modifiedTime,
          sourceUri,
          heading: chunk.heading,
          headingUri,
        },
      };
    });

    // Remove stale chunks before inserting replacements to keep vector state singleton per doc.
    await this.vectorStore.deleteDocumentChunks(document.documentId);
    await this.vectorStore.upsertChunks(vectorChunks);
  }
}

export function createIngestionPipeline(
  config: AppConfig,
  services: {
    docsService: GoogleDocumentFetcher;
    embeddings: EmbeddingService;
    vectorStore: VectorStore;
  }
): IngestionPipeline {
  return new BasicIngestionPipeline(
    config,
    services.docsService,
    services.embeddings,
    services.vectorStore
  );
}

function buildGoogleDocUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}
