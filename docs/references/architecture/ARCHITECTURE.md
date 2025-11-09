# Architecture Overview

This document explains how the VectorDB ingestion service operates, how it should be deployed, and what supporting infrastructure is recommended for a production rollout.

## High-Level Flow

1. **Change detection**
   - Google Drive watches a folder and sends push notifications (via HTTPS or Pub/Sub) whenever a document changes.
   - Notifications arrive at `POST /webhooks/google-drive` with Drive headers identifying the file.

2. **Ingestion pipeline**
   - The webhook handler validates the shared token, extracts the file ID, and enqueues the request with the ingestion pipeline.
   - The pipeline fetches the document via Google Docs API, normalizes content into segments, chunks it with heading awareness, and requests embeddings from the configured provider.
   - Embedding vectors plus metadata are upsert into Supabase (pgvector). Old chunks for the document are removed to keep the index consistent.

3. **Retrieval**
   - Consumers call `POST /search` with a natural-language query.
   - The service embeds the query, runs Supabase’s `match_document_chunks` RPC, and returns the highest-scoring chunks with metadata (source URI, heading anchors).

## Key Components

- **HTTP server** (`src/server.ts`): Lightweight Node HTTP server dispatching to route handlers.
- **Routes** (`src/routes/`): Webhook, search, and health check endpoints.
- **Services** (`src/services/`): Embedding strategy (OpenAI by default), Supabase vector store client, Google Docs fetcher, ingestion pipeline.
- **Infrastructure** (`infra/supabase/`): SQL migration creating tables and vector match function.

## Deployment Topologies

| Scenario                        | Description                                                                                                                                                            | Notes                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Single container                | Run the service as a Node container behind a reverse proxy (nginx, Traefik).                                                                                           | Simplest. Ensure HTTPS termination before `/webhooks/google-drive`.                                   |
| API Gateway + Service Discovery | Place the service behind a managed gateway (AWS API Gateway + Lambda/ALB, GCP API Gateway + Cloud Run) and register it with service discovery (AWS Cloud Map, Consul). | Adds request throttling, auth, and better lifecycle management. Ideal for multi-service environments. |
| Event-driven                    | Accept Pub/Sub or SQS notifications, enqueue ingestion jobs onto a queue (e.g., Cloud Tasks, SQS) processed by workers.                                                | Decouples webhook bursts from ingestion. Use when notifications spike or docs are large.              |

Recommended production setup:

- **Ingress**: Managed API gateway with HTTPS termination and WAF. Examples:
  - AWS: API Gateway (REST/HTTP) → Lambda or Fargate service.
  - GCP: Cloud Run backend behind API Gateway or HTTPS Load Balancer.
- **Service runtime**: Containerized Node app (Docker) with health checks. Target Node 20+. Auto-scale based on CPU or queue depth.
- **Secret management**: Use AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault for Google/Supabase/OpenAI secrets. Mount them as env vars on deploy.
- **Vector database**: Supabase or Cloud SQL with pgvector. Ensure connection pooling (PgBouncer) if running at scale.
- **Logging/Monitoring**: Forward logs to Stackdriver/CloudWatch/Datadog. Expose `/healthz` for readiness probes. Add metrics (ingestion latency, Supabase errors) via OpenTelemetry or StatsD.

## Deployment Steps

1. **Provision infrastructure**
   - Supabase project (apply `infra/supabase/0001_init.sql`).
   - Google Cloud: service account with Drive/Docs API enabled and a webhook endpoint (HTTPS or Pub/Sub).
   - OpenAI (or other embedding provider) API key.

2. **Build & package**
   - `npm run build` → produces `dist/` artifacts.
   - Containerize with a minimal Node image (e.g., `node:20-slim`). Copy `dist/` + `package.json`, run `npm install --omit=dev`, set entrypoint to `node dist/index.js`.

3. **Configure runtime**
   - Provide `.env` values via secret manager or environment configuration.
   - Confirm `HOST`, `PORT`, and security groups/firewall rules allow inbound traffic from Google (if using push HTTPS).

4. **Deploy**
   - Push container to registry.
   - Deploy to target (ECS, Cloud Run, Kubernetes). Configure health checks on `/healthz`.
   - Set up CI/CD to run `npm run test` before deploys.

5. **Enable Drive watch**
   - With infrastructure live, call `files.watch` pointing to your public `/webhooks/google-drive` URL and shared token.
   - Capture the `channelId` and `expiration` to renew before expiry.

6. **Validation**
   - Drop a test doc into the watched folder and verify Supabase `documents`/`document_chunks` have entries.
   - Query `/search` to ensure retrieval works end-to-end.

## Usage Scenarios

- **Primary**: Enrich LLM prompts for customer support, internal knowledge bases, or agent assistants by indexing Google Docs.
- **Extensibility**: Add new `DocumentSource` adapters (Notion, Slack, PDFs) by implementing the same pipeline contract and feeding it into the ingestion queue.

## Security Considerations

- Restrict webhook access to Google IP ranges or enforce mutual TLS/API keys at your gateway.
- Store secrets outside code repositories; rotate keys regularly.
- Validate and sanitize all payloads; current handlers assume Drive payloads but defensive checks guard missing IDs.
- Limit Supabase service-role key scope; use row-level security if exposing read operations to other services.

## Future Enhancements

- Integrate a durable queue (e.g., BullMQ, SQS) for ingestion retry/backoff.
- Expand the OpenAPI document as routes evolve and keep the `/docs` Swagger view in sync with new handlers.
- Emit metrics/traces for ingestion latency and embedding throughput.
- Support streaming responses or server-sent events for long-running ingestion tasks.
