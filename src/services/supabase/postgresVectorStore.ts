import { Pool } from "pg";

import { AppConfig } from "../../utils/config.js";
import {
  VectorStore,
  VectorStoreDocument,
  VectorStoreDocumentChunk,
  VectorStoreQueryResult,
} from "../types.js";

interface PostgresConfig {
  connectionString: string;
  schema: string;
  documentTable: string;
  chunkTable: string;
  matchFunction: string;
  embeddingDimensions: number;
}

export class PostgresVectorStore implements VectorStore {
  private readonly pool: Pool;
  private readonly schema: string;
  private readonly documentTable: string;
  private readonly chunkTable: string;
  private readonly matchFunction: string;

  constructor(private readonly config: PostgresConfig) {
    this.validateIdentifier(config.schema, "schema");
    this.validateIdentifier(config.documentTable, "document table");
    this.validateIdentifier(config.chunkTable, "chunk table");
    this.validateIdentifier(config.matchFunction, "match function");

    this.pool = new Pool({ connectionString: config.connectionString });
    this.schema = config.schema;
    this.documentTable = config.documentTable;
    this.chunkTable = config.chunkTable;
    this.matchFunction = config.matchFunction;
  }

  async upsertDocument(document: VectorStoreDocument): Promise<void> {
    const sql = `
      INSERT INTO ${this.qualify(this.documentTable)} (id, title, source, metadata, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `;

    await this.pool.query(sql, [
      document.documentId,
      document.title,
      document.source,
      JSON.stringify(document.metadata ?? {}),
    ]);
  }

  async upsertChunks(chunks: VectorStoreDocumentChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    for (const chunk of chunks) {
      if (chunk.embedding.length !== this.config.embeddingDimensions) {
        throw new Error(
          `Chunk ${chunk.chunkId} embedding length ${chunk.embedding.length} does not match configured dimension ${this.config.embeddingDimensions}`
        );
      }

      const sql = `
        INSERT INTO ${this.qualify(this.chunkTable)} (id, document_id, content, source, ordering, embedding, metadata, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          content = EXCLUDED.content,
          source = EXCLUDED.source,
          ordering = EXCLUDED.ordering,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `;

      await this.pool.query(sql, [
        chunk.chunkId,
        chunk.documentId,
        chunk.content,
        chunk.source,
        chunk.ordering,
        this.toVectorLiteral(chunk.embedding),
        JSON.stringify(chunk.metadata ?? {}),
      ]);
    }
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    const sql = `DELETE FROM ${this.qualify(this.chunkTable)} WHERE document_id = $1`;
    await this.pool.query(sql, [documentId]);
  }

  async queryByVector(
    vector: number[],
    options: { limit: number }
  ): Promise<VectorStoreQueryResult[]> {
    if (vector.length !== this.config.embeddingDimensions) {
      throw new Error(
        `Query embedding length ${vector.length} does not match configured dimension ${this.config.embeddingDimensions}`
      );
    }

    const sql = `
      SELECT id, document_id, content, score, metadata
      FROM ${this.qualify(this.matchFunction)}($1::vector, $2::int)
    `;

    const { rows } = await this.pool.query<PostgresMatchRow>(sql, [
      this.toVectorLiteral(vector),
      options.limit,
    ]);

    return rows.map((row: PostgresMatchRow) => ({
      chunkId: row.id,
      documentId: row.document_id,
      content: row.content,
      score: Number(row.score),
      metadata: row.metadata ?? {},
    }));
  }

  private qualify(identifier: string): string {
    return `${this.quoteIdentifier(this.schema)}.${this.quoteIdentifier(identifier)}`;
  }

  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private validateIdentifier(value: string, label: string): void {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error(`Invalid ${label} name: ${value}`);
    }
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }
}

interface PostgresMatchRow {
  id: string;
  document_id: string;
  content: string;
  score: number | string;
  metadata: Record<string, unknown> | null;
}

export function createPostgresVectorStore(config: AppConfig): VectorStore {
  const url = config.supabase.url;
  if (!url) {
    throw new Error("Postgres connection string is missing");
  }

  const store = new PostgresVectorStore({
    connectionString: url,
    schema: config.supabase.schema,
    documentTable: config.supabase.documentTable,
    chunkTable: config.supabase.chunkTable,
    matchFunction: config.supabase.matchFunction,
    embeddingDimensions: config.supabase.embeddingDimensions,
  });

  return store;
}
