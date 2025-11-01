export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Vector DB Service API",
    version: "1.0.0",
    description:
      "HTTP interface for health checks, Google Drive ingestion webhooks, and semantic search over the vector store.",
  },
  servers: [
    {
      url: "/",
      description: "Default server",
    },
  ],
  paths: {
    "/healthz": {
      get: {
        summary: "Health check",
        description: "Returns service readiness status.",
        responses: {
          "200": {
            description: "Service is ready",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                  },
                  required: ["status"],
                },
              },
            },
          },
        },
      },
    },
    "/search": {
      post: {
        summary: "Semantic search",
        description:
          "Embeds the provided query and returns the closest matching document chunks from the configured vector store.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SearchRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Search results.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/SearchResult",
                      },
                    },
                  },
                  required: ["results"],
                },
              },
            },
          },
          "400": {
            description: "Missing query parameter in request body.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  missingQuery: {
                    value: { error: "missing_query" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Embedding provider failure.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  embeddingFailure: {
                    value: { error: "embedding_failure" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/webhooks/google-drive": {
      post: {
        summary: "Google Drive webhook",
        description:
          "Validates the Google verification token (when configured), extracts a Drive file identifier, and enqueues ingestion work.",
        parameters: [
          {
            in: "header",
            name: "x-goog-channel-token",
            description: "Shared verification secret.",
            schema: { type: "string" },
            required: false,
          },
          {
            in: "header",
            name: "x-goog-resource-uri",
            description: "Fallback source for Drive file ID extraction.",
            schema: { type: "string" },
            required: false,
          },
          {
            in: "header",
            name: "x-goog-resource-id",
            schema: { type: "string" },
            required: false,
          },
          {
            in: "header",
            name: "x-goog-resource-state",
            schema: { type: "string" },
            required: false,
          },
          {
            in: "header",
            name: "x-goog-message-number",
            schema: { type: "string" },
            required: false,
          },
          {
            in: "header",
            name: "x-goog-changed",
            schema: { type: "string" },
            required: false,
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GoogleDriveWebhookPayload",
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Ingestion request accepted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accepted: { type: "boolean", example: true },
                    fileId: { type: "string", example: "1AbCdEfG2hIjKlmN" },
                  },
                  required: ["accepted", "fileId"],
                },
              },
            },
          },
          "400": {
            description: "Missing file identifier.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  missingFileId: {
                    value: { error: "missing_file_id" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Verification token mismatch.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  invalidToken: {
                    value: { error: "invalid_token" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI document",
        description: "Returns the OpenAPI 3.0 description for this service.",
        responses: {
          "200": {
            description: "OpenAPI JSON document.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/docs": {
      get: {
        summary: "Swagger UI",
        description: "Interactive documentation powered by Swagger UI.",
        responses: {
          "200": {
            description: "HTML page containing Swagger UI.",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchRequest: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language text to embed.",
            example: "summarize the onboarding guide",
          },
          limit: {
            type: "integer",
            format: "int32",
            minimum: 1,
            default: 5,
          },
        },
        required: ["query"],
      },
      SearchResult: {
        type: "object",
        properties: {
          chunkId: { type: "string" },
          documentId: { type: "string" },
          score: { type: "number", format: "float" },
          content: { type: "string" },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["chunkId", "documentId", "score", "content"],
      },
      GoogleDriveWebhookPayload: {
        type: "object",
        properties: {
          fileId: { type: "string", description: "Primary file identifier." },
          id: { type: "string", description: "Alternative field for file ID." },
          resourceId: { type: "string", description: "Alternative field for file ID." },
        },
        additionalProperties: true,
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "missing_query" },
        },
        required: ["error"],
      },
    },
  },
} as const;
