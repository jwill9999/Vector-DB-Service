export interface EmbeddingService {
  embedText(input: string[]): Promise<number[][]>;
}

export interface VectorStoreDocument {
  documentId: string;
  title: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface VectorStoreDocumentChunk {
  documentId: string;
  chunkId: string;
  content: string;
  source: string;
  ordering: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorStoreQueryResult {
  chunkId: string;
  documentId: string;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  upsertDocument(document: VectorStoreDocument): Promise<void>;
  upsertChunks(chunks: VectorStoreDocumentChunk[]): Promise<void>;
  deleteDocumentChunks(documentId: string): Promise<void>;
  queryByVector(vector: number[], options: { limit: number }): Promise<VectorStoreQueryResult[]>;
}

export interface IngestionRequest {
  fileId: string;
  resourceId?: string;
  resourceState?: string;
  messageNumber?: string;
  historyId?: string;
}

export interface IngestionPipeline {
  enqueue(request: IngestionRequest): Promise<void>;
}

export interface AppServices {
  embeddings: EmbeddingService;
  vectorStore: VectorStore;
  ingestion: IngestionPipeline;
}
