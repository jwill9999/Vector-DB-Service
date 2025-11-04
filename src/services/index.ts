import { GoogleDocumentFetcher, GoogleDocsService } from "../google/docsService.js";
import { createServiceAccountClient } from "../google/serviceAccount.js";
import { createIngestionPipeline } from "../ingestion/pipeline.js";
import { AppConfig } from "../utils/config.js";

import { createEmbeddingService } from "./embedding/index.js";
import { createSupabaseVectorStore } from "./supabase/vectorStore.js";
import { AppServices } from "./types.js";

export function createAppServices(config: AppConfig): AppServices {
  const embeddings = createEmbeddingService(config);
  const vectorStore = createSupabaseVectorStore(config);
  const docsService = createDocsFetcher(config);
  const ingestion = createIngestionPipeline(config, { docsService, embeddings, vectorStore });

  return {
    embeddings,
    vectorStore,
    ingestion,
  };
}

function createDocsFetcher(config: AppConfig): GoogleDocumentFetcher {
  try {
    const authClient = createServiceAccountClient(config);
    return new GoogleDocsService(authClient, config.googleDrive.watchFolderId);
  } catch (error) {
    // Fail fast when credentials are missing so webhook handlers surface useful errors.
    // Note: This is intentionally not using structured logging as logger is not available here
    console.warn(
      "Google service account unavailable; ingestion will fail until configured.",
      error
    );
    return {
      async fetchDocument(): Promise<never> {
        throw new Error("Google Drive credentials not configured");
      },
    };
  }
}
