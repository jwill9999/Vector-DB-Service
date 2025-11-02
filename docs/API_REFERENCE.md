# API Reference

The service exposes a small set of HTTP endpoints for health checks, Google Drive change ingestion, and semantic search. All endpoints respond with JSON. Unless otherwise noted, assume the base URL is the host running the Node process (for example, `http://localhost:8080` when running via Docker, or `http://localhost:3000` if you override `PORT` during local development).

## Common Requirements

- Requests must include `content-type: application/json` when a JSON body is provided.
- Responses always include `content-type: application/json; charset=utf-8`.
- Error responses use non-2xx status codes and a JSON object with an `error` string.
- Interactive API docs live at [`/docs`](http://localhost:3000/docs) and source the OpenAPI document from `/openapi.json`.

## GET /healthz

Returns the current readiness status of the service.

- **Purpose:** Liveness/readiness probes.
- **Authentication:** None.
- **Request body:** Empty.
- **Success response:**
  - `200 OK`
  - Body:
    ```json
    { "status": "ok" }
    ```

### Sample

```bash
curl -i http://localhost:3000/healthz
```

## POST /search

Executes a semantic search against the configured vector store. The request text is embedded via the configured embeddings provider before matching against stored document chunks.

- **Authentication:** None.
- **Request body:**
  ```json
  {
    "query": "string (required)",
    "limit": 5
  }
  ```

  - `query` (required): Natural language search text.
  - `limit` (optional): Maximum number of results to return. Must be a positive integer. Defaults to 5 if omitted or invalid.
- **Success response:**
  - `200 OK`
  - Body:
    ```json
    {
      "results": [
        {
          "chunkId": "string",
          "documentId": "string",
          "score": 0.42,
          "content": "string",
          "metadata": {
            "key": "value"
          }
        }
      ]
    }
    ```

    - `score` is a similarity score where larger values indicate a closer match.
    - `metadata` is optional and mirrors the metadata stored with the chunk.
- **Error responses:**
  - `400 Bad Request` with `{ "error": "missing_query" }` if `query` is absent or empty.
  - `500 Internal Server Error` with `{ "error": "embedding_failure" }` if the embeddings provider fails.

### Sample

```bash
curl -i \
  -X POST http://localhost:3000/search \
  -H 'content-type: application/json' \
  -d '{"query":"summarize the onboarding guide","limit":3}'
```

## POST /webhooks/google-drive

Receives Google Drive push notification payloads and enqueues ingestion work. Requests are expected to originate from Google Workspace. The handler validates the shared verification token (if configured) and attempts to extract a Google Drive file identifier from the request body or `x-goog-resource-uri` header.

- **Authentication:** Shared secret via the `x-goog-channel-token` header when `GOOGLE_DRIVE_WEBHOOK_VERIFICATION_SECRET` is configured. When unset, no token validation occurs.
- **Required headers:**
  - `x-goog-resource-uri`: Used as a fallback source for the file ID.
  - `x-goog-resource-id`, `x-goog-resource-state`, `x-goog-message-number`, `x-goog-changed`: Optional headers passed through to the ingestion queue.
- **Request body:** Any JSON object that includes one of `fileId`, `id`, or `resourceId`. The handler also accepts a raw string or Buffer containing JSON.
  ```json
  {
    "fileId": "1AbCdEfG2hIjKlmN",
    "type": "drive#change"
  }
  ```
- **Success response:**
  - `202 Accepted`
  - Body:
    ```json
    { "accepted": true, "fileId": "1AbCdEfG2hIjKlmN" }
    ```
- **Error responses:**
  - `401 Unauthorized` with `{ "error": "invalid_token" }` when the verification secret is set and the token header does not match.
  - `400 Bad Request` with `{ "error": "missing_file_id" }` when no file identifier can be determined.

### Sample

```bash
curl -i \
  -X POST http://localhost:3000/webhooks/google-drive \
  -H 'content-type: application/json' \
  -H 'x-goog-channel-token: <shared-secret>' \
  -H 'x-goog-resource-uri: https://www.googleapis.com/drive/v3/files/1AbCdEfG2hIjKlmN' \
  -d '{"fileId":"1AbCdEfG2hIjKlmN"}'
```

### Testing Tips

- Use ngrok or a similar tunnel if Google Drive needs to reach your local instance.
- Responses surface validation errors immediately; ingestion itself is asynchronous and handled by the configured queue.

## Environment Notes

- The search pathway depends on a configured embeddings service (`OPENAI_API_KEY` or equivalent). If embeddings fail, the API returns `embedding_failure`.
- Vector search requires the Supabase schema (see `infra/supabase/`) to be deployed and the service configured with either Supabase service-role credentials or a direct Postgres connection.
- The Google Drive webhook will accept requests without a token only when `GOOGLE_DRIVE_WEBHOOK_VERIFICATION_SECRET` is unset; enable it in production.
