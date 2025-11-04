import { GoogleDocumentFetcher, GoogleDocsService } from "../google/docsService.js";
import { createServiceAccountClient } from "../google/serviceAccount.js";
import { createIngestionPipeline } from "../ingestion/pipeline.js";
import { AppConfig } from "../utils/config.js";
import { Logger } from "../utils/logger.js";

import { createEmbeddingService } from "./embedding/index.js";
import { createSupabaseVectorStore } from "./supabase/vectorStore.js";
import { AppServices } from "./types.js";

export function createAppServices(config: AppConfig, logger: Logger): AppServices {
  const embeddings = createEmbeddingService(config, logger);
  const vectorStore = createSupabaseVectorStore(config, logger);
  const docsService = createDocsFetcher(config, logger);
  const ingestion = createIngestionPipeline(config, { docsService, embeddings, vectorStore });

  return {
    embeddings,
    vectorStore,
    ingestion,
  };
}

function createDocsFetcher(config: AppConfig, logger: Logger): GoogleDocumentFetcher {
  try {
    const authClient = createServiceAccountClient(config);
    return new GoogleDocsService(authClient, config.googleDrive.watchFolderId);
  } catch (error) {
    logger.warn(
      { err: error },
      "Google service account unavailable; ingestion will fail until configured."
    );
    return {
      async fetchDocument(): Promise<never> {
        throw new Error("Google Drive credentials not configured");
      },
    };
  }
}
