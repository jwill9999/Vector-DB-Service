# Repository Guidelines

## Project Structure & Module Organization

- Runtime code lives in `src/`. Key folders: `routes/` (HTTP handlers), `services/` (embeddings, Supabase client, Google Docs ingest), `ingestion/` (chunking + pipeline), `google/` (API helpers), `testing/` (unit-test mocks), and `infra/` (database migrations).
- `src/index.ts` bootstraps config, services, and the HTTP server. Build output lands in `dist/`; keep it untracked. Tests compile alongside features in `__tests__/` folders.
- Environment variables are centralized via `src/config.ts`; surface new configuration there before threading through services.

## Build, Test, and Development Commands

- `npm run build` cleans `dist/` then invokes `tsc -p tsconfig.json`.
- `npm run start` executes the compiled microservice from `dist/index.js`.
- `npm run lint`/`lint:fix` run ESLint against the TypeScript tree.
- `npm run format` / `format:check` apply or verify Prettier formatting.
- `npm run test` rebuilds the project and runs Node’s test runner over `dist/**/*.test.js`. Integration tests against Supabase auto-skip unless the `SUPABASE_TEST_*` variables are set.

## Coding Style & Naming Conventions

- Prettier enforces 2-space indentation, 100-character lines, trailing commas, and semicolons. ESLint (`@typescript-eslint` + `prettier`) guards TypeScript-safe patterns.
- Use `camelCase` for variables/functions, `PascalCase` for classes/types, and kebab-case filenames (`google-drive-webhook.test.ts`).
- Export explicit types/interfaces from service layers, avoid `any`, and document complex logic with brief comments.

## Testing Guidelines

- Co-locate unit tests in `__tests__/` next to the feature under test. Import public exports from the compiled module surface.
- Mock external systems (Google APIs, Supabase, OpenAI) via utilities in `testing/` for deterministic unit tests.
- To run Supabase integration tests (`src/services/supabase/__tests__/vectorStore.integration.test.ts`), provide `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, and optional overrides for schema/table/function names.

## Commit & Pull Request Guidelines

- Run `npm run commit` before staging; Husky’s `pre-commit` hook will fail on lint issues.
- Use `<type>: <summary>` commit subjects (`feat: connect supabase vector store`), wrap body text at 72 chars, and reference issues when relevant.
- PRs should outline ingestion/search changes, list new env vars (e.g., `SUPABASE_URL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `OPENAI_API_KEY`), surface database migration files, and paste sample responses or schema diffs.
- Ensure `npm run build` and `npm run test` pass locally; call out any follow-up migrations or manual setup in the PR description.

## Tooling & Environment

- After cloning run `npm install` then `npm run prepare` for Husky hooks.
- Required runtime secrets: Google service-account email/key, Supabase URL + service role key, and an OpenAI API key. Supply them via `.env` or your orchestrator before deploying.
- Apply migrations under `infra/supabase/` to your database (e.g., `psql < infra/supabase/0001_init.sql`) before running the service. Target Node 20+ to align with ES2022 output, the Node test runner, and the `node --test` command.
