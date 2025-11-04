export type EnvironmentName = "development" | "test" | "production";

export interface GoogleDriveConfig {
  /** Google Drive folder whose changes should trigger ingestion. */
  watchFolderId?: string;
  /** Verification token returned with Google webhook notifications. */
  webhookVerificationSecret?: string;
  /** Service account email used for Drive/Docs API access. */
  serviceAccountEmail?: string;
  /** Base64 or JSON string for the service account private key. */
  serviceAccountKey?: string;
  /** Optional Pub/Sub topic if using push notifications via GCP. */
  pubsubTopic?: string;
}

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
  anonKey?: string;
  directUrl?: string;
  schema: string;
  documentTable: string;
  chunkTable: string;
  matchFunction: string;
  embeddingDimensions: number;
}

export type EmbeddingProvider = "openai" | "custom";

export interface OpenAIEmbeddingConfig {
  apiKey?: string;
  model: string;
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  openai: OpenAIEmbeddingConfig;
}

export interface AppConfig {
  env: EnvironmentName;
  host: string;
  port: number;
  googleDrive: GoogleDriveConfig;
  supabase: SupabaseConfig;
  embeddings: EmbeddingConfig;
  ingestionQueueName: string;
}

const DEFAULT_SUPABASE: SupabaseConfig = {
  url: undefined,
  serviceRoleKey: undefined,
  anonKey: undefined,
  directUrl: undefined,
  schema: "public",
  documentTable: "documents",
  chunkTable: "document_chunks",
  matchFunction: "match_document_chunks",
  embeddingDimensions: 1536,
};

const DEFAULT_EMBEDDINGS: EmbeddingConfig = {
  provider: "openai",
  openai: {
    apiKey: undefined,
    model: "text-embedding-3-small",
  },
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const environment = normalizeEnvironment(env.NODE_ENV);
  const host = env.HOST ?? "0.0.0.0";
  const port = normalizePort(env.PORT);

  return {
    env: environment,
    host,
    port,
    googleDrive: {
      watchFolderId: env.GOOGLE_DRIVE_WATCH_FOLDER_ID,
      webhookVerificationSecret: env.GOOGLE_DRIVE_WEBHOOK_SECRET,
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      serviceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
      pubsubTopic: env.GOOGLE_PUBSUB_TOPIC,
    },
    supabase: {
      ...DEFAULT_SUPABASE,
      url: env.SUPABASE_URL ?? DEFAULT_SUPABASE.url,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_SUPABASE.serviceRoleKey,
      anonKey: env.SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE.anonKey,
      directUrl: env.SUPABASE_DIRECT_URL ?? DEFAULT_SUPABASE.directUrl,
      schema: env.SUPABASE_SCHEMA ?? DEFAULT_SUPABASE.schema,
      documentTable: env.SUPABASE_DOCUMENT_TABLE ?? DEFAULT_SUPABASE.documentTable,
      chunkTable: env.SUPABASE_CHUNK_TABLE ?? DEFAULT_SUPABASE.chunkTable,
      matchFunction: env.SUPABASE_MATCH_FUNCTION ?? DEFAULT_SUPABASE.matchFunction,
      embeddingDimensions:
        env.SUPABASE_EMBEDDING_DIMENSIONS !== undefined
          ? Number.parseInt(env.SUPABASE_EMBEDDING_DIMENSIONS, 10)
          : DEFAULT_SUPABASE.embeddingDimensions,
    },
    embeddings: {
      ...DEFAULT_EMBEDDINGS,
      provider:
        (env.EMBEDDING_PROVIDER as EmbeddingProvider | undefined) ?? DEFAULT_EMBEDDINGS.provider,
      openai: {
        apiKey: env.OPENAI_API_KEY ?? DEFAULT_EMBEDDINGS.openai.apiKey,
        model: env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDINGS.openai.model,
      },
    },
    ingestionQueueName: env.INGESTION_QUEUE_NAME ?? "google-docs-ingest",
  };
}

function normalizeEnvironment(value: string | undefined): EnvironmentName {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function normalizePort(portValue: string | undefined): number {
  const parsed = Number.parseInt(portValue ?? "8080", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 8080;
  }

  return parsed;
}
