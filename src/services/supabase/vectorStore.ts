import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

import { AppConfig } from "../../utils/config.js";
import { Logger } from "../../utils/logger.js";
import {
  VectorStore,
  VectorStoreDocument,
  VectorStoreDocumentChunk,
  VectorStoreQueryResult,
} from "../types.js";

class SupabaseVectorStore implements VectorStore {
  /**
   * Thin wrapper around Supabase RPCs and tables defined in infra/supabase/ migrations.
   * Assumes pgvector is enabled and the match function signature mirrors the defaults.
   */
  private readonly client: SupabaseClient;
  private readonly functionName: string;

  constructor(private readonly config: AppConfig["supabase"]) {
    if (!config.url || !config.serviceRoleKey) {
      throw new Error("Supabase credentials are not configured");
    }

    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.functionName = qualify(config.schema, config.matchFunction);
  }

  async upsertDocument(document: VectorStoreDocument): Promise<void> {
    const payload = {
      id: document.documentId,
      title: document.title,
      source: document.source,
      metadata: document.metadata ?? {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.fromTable(this.config.documentTable).upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(`Supabase document upsert failed: ${error.message}`);
    }
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
    }

    const rows = chunks.map((chunk) => ({
      id: chunk.chunkId,
      document_id: chunk.documentId,
      content: chunk.content,
      source: chunk.source,
      ordering: chunk.ordering,
      embedding: chunk.embedding,
      metadata: chunk.metadata ?? {},
      updated_at: new Date().toISOString(),
    }));

    const { error } = await this.fromTable(this.config.chunkTable).upsert(rows, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(`Supabase chunk upsert failed: ${error.message}`);
    }
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    const { error } = await this.fromTable(this.config.chunkTable)
      .delete()
      .eq("document_id", documentId);

    if (error) {
      throw new Error(`Supabase chunk deletion failed: ${error.message}`);
    }
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

    const { data, error } = await this.client.rpc(this.functionName, {
      query_embedding: vector,
      match_count: options.limit,
    });

    if (error) {
      throw new Error(`Supabase vector match failed: ${error.message}`);
    }

    return (
      (data as SupabaseMatchRow[] | null)?.map((row) => ({
        chunkId: row.id,
        documentId: row.document_id,
        content: row.content,
        score: row.score,
        metadata: row.metadata ?? {},
      })) ?? []
    );
  }

  private fromTable(table: string) {
    return this.client.schema(this.config.schema).from(table);
  }
}

class PostgresVectorStore implements VectorStore {
  private readonly pool: Pool;
  private readonly schema: string;
  private readonly documentTable: string;
  private readonly chunkTable: string;
  private readonly matchFunction: string;

  constructor(private readonly config: AppConfig["supabase"]) {
    if (!config.directUrl) {
      throw new Error("SUPABASE_DIRECT_URL must be provided for Postgres vector store");
    }

    this.pool = new Pool({ connectionString: config.directUrl });
    this.schema = config.schema;
    this.documentTable = qualify(this.schema, config.documentTable);
    this.chunkTable = qualify(this.schema, config.chunkTable);
    this.matchFunction = qualify(this.schema, config.matchFunction);
  }

  async upsertDocument(document: VectorStoreDocument): Promise<void> {
    const sql = `
      INSERT INTO ${this.documentTable}
        (id, title, source, metadata, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at;
    `;

    await this.pool.query(sql, [
      document.documentId,
      document.title,
      document.source,
      document.metadata ?? {},
      new Date().toISOString(),
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
    }

    const columnList =
      "(id, document_id, content, source, ordering, embedding, metadata, updated_at)";
    const values: string[] = [];
    const params: unknown[] = [];
    const timestamp = new Date().toISOString();

    chunks.forEach((chunk, index) => {
      const offset = index * 8;
      values.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::vector, $${offset + 7}, $${offset + 8})`
      );
      params.push(
        chunk.chunkId,
        chunk.documentId,
        chunk.content,
        chunk.source,
        chunk.ordering,
        vectorToLiteral(chunk.embedding),
        chunk.metadata ?? {},
        timestamp
      );
    });

    const sql = `
      INSERT INTO ${this.chunkTable}
        ${columnList}
      VALUES ${values.join(", ")}
      ON CONFLICT (id)
      DO UPDATE SET
        document_id = EXCLUDED.document_id,
        content = EXCLUDED.content,
        source = EXCLUDED.source,
        ordering = EXCLUDED.ordering,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at;
    `;

    await this.pool.query(sql, params);
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    const sql = `DELETE FROM ${this.chunkTable} WHERE document_id = $1;`;
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
      SELECT
        id,
        document_id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS score
      FROM ${this.chunkTable}
      ORDER BY embedding <=> $1::vector
      LIMIT $2;
    `;

    const { rows } = await this.pool.query(sql, [vectorToLiteral(vector), options.limit]);
    return rows.map((row) => ({
      chunkId: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      score: Number(row.score),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }
}

interface SupabaseMatchRow {
  id: string;
  document_id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

class NoopVectorStore implements VectorStore {
  constructor(private readonly logger: Logger) {}

  async upsertDocument(document: VectorStoreDocument): Promise<void> {
    this.logger.warn(
      { documentId: document.documentId },
      "Supabase not configured; skipping document"
    );
  }

  async upsertChunks(chunks: VectorStoreDocumentChunk[]): Promise<void> {
    this.logger.warn({ chunkCount: chunks.length }, "Supabase not configured; skipping chunks");
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    this.logger.warn({ documentId }, "Supabase not configured; cannot delete chunks for document");
  }

  async queryByVector(): Promise<VectorStoreQueryResult[]> {
    this.logger.warn("Supabase not configured; returning no results.");
    return [];
  }
}

export function createSupabaseVectorStore(config: AppConfig, logger: Logger): VectorStore {
  const { url, serviceRoleKey, directUrl } = config.supabase;

  if (url && serviceRoleKey) {
    try {
      return new SupabaseVectorStore(config.supabase);
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Supabase vector store");
      return new NoopVectorStore(logger);
    }
  }

  if (directUrl) {
    try {
      return new PostgresVectorStore(config.supabase);
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Postgres vector store");
      return new NoopVectorStore(logger);
    }
  }

  logger.warn("Supabase URL or service role key missing; using no-op vector store.");
  return new NoopVectorStore(logger);
}

function qualify(schema: string, identifier: string): string {
  if (!schema || schema === "public") {
    return identifier;
  }

  return `${schema}.${identifier}`;
}

function vectorToLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
