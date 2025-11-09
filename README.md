# VectorDB Ingestion Service

This microservice ingests Google Docs into a Supabase-backed vector store and exposes a retrieval endpoint for Retrieval-Augmented Generation (RAG) workloads. It watches a designated Google Drive folder, chunkifies updated docs, embeds them via OpenAI, and stores vectors in Supabase (pgvector). A downstream Node application can query the `/search` API to hydrate prompts with relevant context.

## Documentation Index

- [Repository Guidelines](docs/guides/contributors/AGENTS.md)
- [Architecture Overview](docs/references/architecture/ARCHITECTURE.md)
- [Service Flow Diagram](docs/references/architecture/SERVICE_FLOW.md)
- [Google Drive Watch Playbook](docs/guides/operations/GOOGLE_DRIVE_WATCH.md)
- [Supabase Operations Guide](docs/guides/operations/SUPABASE_OPERATIONS.md)
- [Deployment Playbook](docs/playbooks/DEPLOYMENT_PLAYBOOK.md)
- [Local Docker Workflow](docs/tutorials/LOCAL_DOCKER.md)
- [Testing Playbook](docs/guides/contributors/TESTING.md)

## Quick Start

```bash
make install  # npm install
make dev      # build + start with environment sourced from .env
```

Use `make dev` while iterating locally.

### Essential Make Targets

| Command                 | Purpose                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `make dev`              | Run the service locally with configuration from `.env`.                                                    |
| `make docker-supabase`  | Launch only the Supabase container for dedicated ingestion/search testing.                                 |
| `make docker`           | Bring up the full stack (service + Supabase) via Docker Compose.                                           |
| `make test`             | Execute the Node test suite with `.env.test` exported.                                                     |
| `make test-with-docker` | Provision Supabase via Docker, apply migrations, run `make test`, then tear down containers automatically. |

- `POST /webhooks/google-drive` — Google Drive push notifications (expects Drive headers)
- `POST /search` — accepts `{ "query": string, "limit"?: number }` and returns matching chunks

No HTML UI or OpenAPI docs are generated yet; interact via HTTP clients (e.g., curl, Postman) or wire the downstream application directly.

## Environment & Configuration

All runtime configuration lives in environment variables (`src/config.ts`). Key settings:

| Variable                                    | Purpose                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `HOST`, `PORT`                              | Network binding (default `0.0.0.0:8080`).                                             |
| `GOOGLE_DRIVE_WATCH_FOLDER_ID`              | Folder ID being watched in Drive.                                                     |
| `GOOGLE_DRIVE_WEBHOOK_SECRET`               | Shared token validated against `x-goog-channel-token`.                                |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`KEY`        | Credentials used to fetch Docs content.                                               |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project connection.                                                          |
| `SUPABASE_DIRECT_URL`                       | Direct Postgres connection used when running locally without the Supabase REST stack. |
| `SUPABASE_MATCH_FUNCTION`                   | RPC performing vector similarity (defaults to `match_document_chunks`).               |
| `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`  | Embedding provider configuration.                                                     |

Consult `.env.example` for the full list. For local runs: `export $(grep -v '^#' .env | xargs)` before invoking `npm run start`.

### Environment file precedence

- `.env` — Production defaults and host runs. `make prod` and `make dev` load this file by default; production deployments should mirror its keys via secrets.
- `.env.docker` — Local Docker configuration. `make docker` (and any `docker-*` helper) sets `SERVICE_ENV_FILE=.env.docker`, so the service container receives only these values.
- `.env.test` — Supabase-on-localhost profile for automated tests. `make test` exports this file before building and running the Node test suite.
- Overrides — Pass `ENV_FILE=/path/to/custom.env make dev` (or `PROD_ENV_FILE=... make prod`) to opt into alternative profiles. Compose honours whichever path you provide through `SERVICE_ENV_FILE`.

Within Docker there is no secondary override layer—the service container reads exactly the file supplied through `SERVICE_ENV_FILE`. Host commands export just the file you choose, so avoid chaining multiple env files unless you want the later exports to shadow earlier ones.

## Essential Make Targets

Reference the table above for the most common workflows. Additional commands live in the `Makefile` and supporting docs under `docs/`.

## Google Drive Watch Setup

1. Enable Drive & Docs APIs in Google Cloud, create a service account, and share the target folder with it.
2. Deploy an HTTPS endpoint (production domain or tunnel) pointing to `/webhooks/google-drive` and provide the static token from `GOOGLE_DRIVE_WEBHOOK_SECRET`.
3. Call [`files.watch`](https://developers.google.com/drive/api/v3/reference/files/watch) on the folder, set `address` to your webhook URL, and `token` to the shared secret. Renew the watch before the `expiration` timestamp.
4. The webhook logs ingestion attempts; use Supabase now to confirm the `documents` and `document_chunks` records.

If Pub/Sub push notifications are used instead of Drive direct webhooks, set `GOOGLE_PUBSUB_TOPIC` and configure the subscription to forward messages to the service.

## Supabase Migrations

Apply `infra/supabase/0001_init.sql` once per environment. It creates the `documents`/`document_chunks` tables, ivfflat index, and `match_document_chunks` function. Example:

```bash
psql "$SUPABASE_URL" -f infra/supabase/0001_init.sql
```

(Use the connection info from Supabase's SQL editor or Admin UI.)

## Troubleshooting

- **Webhook returns 401**: Check `GOOGLE_DRIVE_WEBHOOK_SECRET` matches the `x-goog-channel-token` header.
- **Ingestion no-ops**: Ensure the service account has access to the doc, the folder ID matches, and Supabase env vars are set. Logs mention missing credentials.
- **Supabase errors**: Inspect Supabase logs; ensure migrations were applied and the `vector` extension exists. Verify `SUPABASE_MATCH_FUNCTION` points to the deployed RPC.
- **Search returns empty**: Confirm embeddings were upserted (look for rows in `document_chunks`). If testing locally without an OpenAI key, deterministic stub vectors are used—results may be arbitrary.
- **Integration tests skipped**: Set `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` to run the Supabase integration suite.

## Development Notes

- The service runs on Node 20+ targeting ES2022 modules.
- Unit tests use Node’s built-in test runner (`node --test`). Integration coverage for Supabase lives in `src/services/supabase/__tests__/` and auto-skips without credentials.
- Routes are defined in `src/routes`. Handlers receive parsed JSON bodies through the shared `RouteContext`.
- Chunks include heading metadata and source URIs. Downstream clients can use this to construct user-facing references.

Feel free to extend the Makefile and documentation under `docs/` as new tooling or endpoints arrive.
