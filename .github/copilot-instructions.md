# Copilot Instructions

## What this service does

- VectorDB Ingestion Service pulls Google Docs into Supabase pgvector and exposes `/search` via a hand-rolled HTTP server (`src/server.ts`).
- Bootstrapping happens in `src/index.ts`: load config (`src/utils/config.ts`) → create logger (`src/utils/logger.ts`) → build service container (`createAppServices`) → start the Node `http` server.
- Routes live in `src/routes/` and are simple objects `{ method, pathname, handler }`; handlers receive a `RouteContext` with `config`, typed `services`, `logger`, and the raw `IncomingMessage`/`ServerResponse` pair.

## Key Modules & Patterns

- Configuration is centralized in `src/utils/config.ts`. Any new env var must be surfaced there before it is consumed elsewhere.
- Logging is centralized in `src/utils/logger.ts` using Pino. Create via `createLogger(config.env)`; prefer `logger.info|warn|error` with structured objects. PR checks forbid `console.log`/`console.debug` in `src/`.
- Central error handling in `src/middleware/errorHandler.ts`: logs with `logger.error` and responds `{ error: "internal_error" }` with status 500. 404s return `{ error: "not_found" }`.
- `createAppServices` in `src/services/index.ts` wires embeddings, Supabase vector store, Google Docs fetcher, and the ingestion pipeline. Respect this composition when adding new dependencies.
- `src/ingestion/pipeline.ts` orchestrates fetch → chunk → embed → Supabase upsert. It always deletes stale chunks before inserting replacements—preserve that contract.
- Supabase access is abstracted via `src/services/supabase/vectorStore.ts`, which auto-selects Supabase REST, direct Postgres (see `src/services/supabase/postgresVectorStore.ts`), or a no-op implementation. Prefer extending these classes instead of calling Supabase directly from routes.
- Embedding providers are abstracted (`src/services/embedding/`). `createEmbeddingService` returns the correct implementation based on config; add new providers behind this factory.

## External Systems

- Google Docs access flows through `src/google/docsService.ts` using a service-account client created in `src/google/serviceAccount.ts`.
- Supabase migrations live under `infra/supabase/`. Schema changes must ship with SQL updates and keep the vector store wrappers in sync.
- OpenAI embeddings are the default (`text-embedding-3-small`). Tests rely on stubs when the API key is absent; avoid hardcoding other providers in tests.

## Build & Test Workflow

- `make build` → `npm run build` (TypeScript compile). `make start` runs the compiled service.
- `make test` exports `.env.test` and runs the Node test runner. Integration specs auto-skip unless `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` are present.
- `make test-with-docker` spins up an isolated Supabase stack (`vectordb_test` project/prefix), runs migrations, executes `make test`, then tears the stack down. Use `make docker-test-down` / `docker-test-clean` only for recovery.
- For editing behaviors, consult `docs/TESTING.md` before adjusting loops; link it in PRs when changing the workflow.

## Coding Conventions

- TypeScript (ESM) with Node 20 targets; no `any` unless absolutely necessary. Prefer explicit interfaces exported from `src/services/types.ts`.
- Formatting is enforced via Prettier (2 spaces, 100-char lines); run `npm run lint`/`npm run format` when touching TypeScript.
- Handlers set HTTP status/headers directly; respond with JSON strings and guard against missing bodies (`searchHandler` is the model).
- Logging: use the injected Pino `logger` (no `console.log`/`console.debug` in `src/` — enforced by PR checks). A limited `console.warn` exists in `src/ingestion/pipeline.ts` for non-fatal visibility; prefer converting such cases to structured `logger.warn` where appropriate.

## When Extending

- New HTTP endpoints: add to `src/routes/index.ts`, create a handler in `src/routes/`, and update OpenAPI descriptions in `src/routes/openapi.ts` and `src/openapi.ts` if the contract changes.
- Adding ingestion steps: modify `BasicIngestionPipeline` or introduce composition around it—keep chunk deletion/upsert order intact to avoid stale vectors.
- Introducing config-dependent behaviour: update `loadConfig`, use factories in `src/services/`, and write tests under the matching `__tests__/` directory.
- Touching Supabase schema: update SQL in `infra/supabase`, adjust vector store adapters, and expand integration tests (`src/services/supabase/__tests__/`).

## Documentation & References

- High-level context: `README.md`, `docs/ARCHITECTURE.md`, and `docs/SERVICE_FLOW.md`.
- Operator guides: `docs/LOCAL_DOCKER.md`, `docs/SUPABASE_OPERATIONS.md`, `docs/TESTING.md`.
- Follow commit workflow in `AGENTS.md` (`npm run commit`, conventional commits) before staging changes.

## Pointers

- Examples to copy: `src/routes/search.ts` (handler shape), `src/ingestion/pipeline.ts` (orchestration), `src/services/supabase/vectorStore.ts` (data access abstraction).
- Start here for the “why”: `docs/ARCHITECTURE.md` and `docs/SERVICE_FLOW.md`.
- For integration runs, prefer `make test-with-docker` to get a clean Supabase with migrations applied automatically.

## GitHub Actions (CI/CD)

- CI (`.github/workflows/ci.yml`):
  - Lint/format checks (ESLint, Prettier), build, unit tests with coverage upload (Codecov), integration tests via `make test-with-docker`, and a TypeScript type-check job. Runs on Node 20 with npm caching.
- PR Checks (`.github/workflows/pr-checks.yml`):
  - Fails if build produces uncommitted changes; forbids `console.log`/`console.debug` in `src/`; ensures `package-lock.json` is current; reports bundle size; runs `npm audit` and `npm outdated`.
- Dependabot (`.github/dependabot.yml`): weekly npm and monthly GitHub Actions updates with labelled PRs and conventional commit prefixes.
