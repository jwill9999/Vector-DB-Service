# Testing Playbook

This guide walks through the testing options for the VectorDB ingestion service. It is aimed at a junior developer who is running the suite locally for the first time.

## Prerequisites

- Node.js 20+
- Docker Desktop (or any Docker Engine) running
- Local environment files copied from `.env.example`
  - `.env.test` powers host-based test runs
  - `.env.docker` supplies values to the Docker Compose stack
- Optional: a running Supabase instance if you want to point tests at something other than the local Compose stack

## Unit Test Loop (`make test`)

Use `make test` for the fast feedback cycle. The target loads `.env.test` and then executes the Node test runner:

```bash
make test
```

### What it covers

- All fast-running unit tests under `src/**/__tests__/`
- Optional integration specs when the Supabase env vars are present (see next section)

### Limitations

- Does **not** start Docker or provision a database on its own. If `.env.test` points at the Compose database, you must have that container running already.

## Unit vs. Integration Tests

| Type                  | How to run                                                                                 | Dependencies                                             | Purpose                                                      | When to run                                                        |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Unit tests**        | `make test`                                                                                | None beyond local Node environment                       | Validate isolated logic (chunking, route handlers, helpers). | Whenever you change application code; ideal inner loop.            |
| **Integration tests** | `make test-with-docker` (or `make test` with Supabase env vars pointing at an existing DB) | Real Postgres instance or the Compose Supabase container | Exercise Supabase vector store behaviour end-to-end.         | After schema changes, Supabase pipeline tweaks, or before merging. |

- **Speed**: unit tests complete in seconds and require no external services. Integration tests take longer because they connect to Postgres and run the ingestion/search flow.
- **Isolation**: keep integration tests pointed at disposable databases (such as the Docker-backed stack) to avoid mutating dev data.
- **Debugging tip**: when an integration test fails, rerun it under `make test-with-docker` to ensure the schema is freshly migrated.

## Docker-Backed Test Loop (`make test-with-docker`)

`make test-with-docker` spins up an isolated Supabase stack, applies the migration, runs the tests, and tears everything down automatically.

```bash
make test-with-docker
```

### What happens under the hood

1. `docker compose` launches the `supabase` and `migrate` services under the isolated project name `vectordb_test`.
2. The migration waits for the health check and runs `infra/supabase/0001_init.sql`.
3. The target reuses `make test`, so the Node suite runs with `.env.test`.
4. A shell `trap` calls `docker compose down` for the `vectordb_test` project, so the containers are removed even if the tests fail.

> **Note:** The application service container is not started for this loop. The Node tests run on your host machine (or CI runner) and connect directly to the temporary Supabase instance, so there is no need to launch `service` unless you want to perform manual end-to-end checks.

### Why it is safe for development

- Containers use the prefix `vectordb_test_*`, so they do not collide with the default development containers (`vectordb_*`).
- The Compose project name is also set to `vectordb_test`, which keeps the lifecycle completely separate from the dev stack.

### When to prefer this loop

- You want an end-to-end run against a fresh database without touching the development instance.
- You are preparing to push changes that rely on the Supabase schema or vector search pipeline.

## Cleanup & Recovery Targets

If the Docker-backed loop is interrupted (for example, you hit `Ctrl+C` before teardown completes), use these helpers:

```bash
make docker-test-down   # docker compose down for the vectordb_test stack
make docker-test-clean  # docker compose down -v for the vectordb_test stack (drops volumes)
```

> These commands only affect the test stack because they export the same project name and container prefix as `make test-with-docker`.

## Customisation

- Override the project name: `TEST_COMPOSE_PROJECT=my_test make test-with-docker`
- Override the container prefix: `TEST_CONTAINER_PREFIX=my_test make test-with-docker`
- Combine the overrides when you need to run multiple test stacks side by side.

Remember to update `.env.test` if you change ports or connection strings in `docker-compose.yml`.

## Troubleshooting

- **Port already in use**: Stop any development Supabase container before starting the test loop, or give the test stack a dedicated port and update `.env.test` accordingly.
- **Migrations fail**: Inspect the `migrate` container logs (`docker compose logs migrate`) to see the Postgres error. The stack will stay up until the trap runs, so you can debug interactively.
- **Integration tests skipped**: Check that the Supabase env vars are present in `.env.test`—the Node test runner logs a skip message when they are missing.

For more detail on running the service in Docker, see `docs/LOCAL_DOCKER.md`. For Supabase schema operations, refer to `docs/SUPABASE_OPERATIONS.md`.
