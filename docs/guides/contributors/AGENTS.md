# Repository Guidelines

## Project Structure & Module Organization
TypeScript sources live in `src/`, grouped by feature: `routes/` for HTTP handlers, `services/` for Supabase and embedding clients, `middleware/`, `utils/`, and `google/` integrations. Tests mirror runtime code under `src/routes/__tests__/` and `src/services/supabase/__tests__/`. Built JavaScript lands in `dist/`. Operational scripts and migrations sit in `infra/`, while design docs and runbooks are under `docs/`. Container and orchestration assets live in `Dockerfile`, `docker-compose.yml`, and the `Makefile`.

## Build, Test & Development Commands
Use `make install` to run `npm install`. `make dev` builds, applies `.env`, and starts the service locally. For manual workflows, `npm run build` compiles TypeScript, `npm run start` executes the compiled server, and `npm run clean` resets `dist/`. Linting and formatting rely on `npm run lint`, `npm run lint:fix`, `npm run format`, and `npm run format:check`. Run the test suite with `npm run test`; `npm run test:coverage` produces HTML and lcov output in `coverage/`.

## Coding Style & Naming Conventions
Follow the repository ESLint + Prettier configuration (2-space indentation, semicolons, single quotes where applicable). Favor descriptive camelCase for variables/functions, PascalCase for classes, kebab-case for filenames, and align interface/type names with their modules (e.g., `SearchRequest` in `search.ts`). Keep modules focused; extract shared helpers into `src/utils/` and reuse DTOs from `src/routes/types.ts`.

## Testing Guidelines
Node 20’s built-in test runner drives both unit and integration tests. Place unit tests beside routes or services in `__tests__` folders using the `*.test.ts` suffix. Integration tests that touch Supabase (e.g., `vectorStore.integration.test.ts`) require `SUPABASE_TEST_URL` and related keys; skip markers guard runs when missing. Always run `npm run test` before opening a PR, and share coverage deltas from `npm run test:coverage` when touching ingestion or search flows.

## Commit & Pull Request Guidelines
Commit messages should stay concise and imperative (e.g., `Add Supabase retry logging`), optionally scoping with a noun phrase when helpful. Group related changes and avoid mixing formatting and feature work. Pull requests must include: summary of intent, explicit testing evidence (commands executed), references to issue or incident IDs, and screenshots/log snippets for behavioral changes. Request reviews from owners of any touched area (`routes/`, `services/`, infra) and wait for CI green lights before merge.

## Environment & Operational Notes
Configuration is driven by `.env` files; inspect `README.md` for variable explanations. Prefer `make docker` or `make docker-supabase` when exercising ingestion end-to-end, and never commit secrets—store them in the configured secret manager or `.env.local` ignored by Git. When adding new external integrations, document required env vars in `docs/` and extend the relevant Make targets.
