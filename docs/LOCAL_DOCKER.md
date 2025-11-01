# Local Docker Workflow

This guide explains how to run the ingestion service and its Supabase dependency locally using Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine 20+
- `.env` populated with service credentials (OpenAI key optional for local-only testing)
- `infra/supabase/0001_init.sql` applied to the local Supabase instance (steps below)

## Starting Supabase Only

```bash
make docker-supabase      # launches supabase/postgres on port 54322
```

Once healthy, apply the schema:

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f infra/supabase/0001_init.sql
```

Export env vars so tests hit the local database:

```bash
export SUPABASE_TEST_URL=postgresql://postgres:postgres@localhost:54322/postgres
export SUPABASE_TEST_SERVICE_ROLE_KEY=postgres
npm run test
```

Shut it down with `make docker-down` (or `make docker-clean` to remove volumes).

## Running the Service + Supabase

```bash
make docker         # builds the service image (if needed) and starts Supabase + the app using .env.docker
```

The service binds to `http://localhost:8080`. `docker-compose` runs the SQL in `infra/supabase/0001_init.sql` automatically before the service boots, so tables are ready out of the box. The service talks to the local Postgres instance via `SUPABASE_DIRECT_URL`; swap in your hosted Supabase REST URL + service role key when you want to mirror production exactly.

> **Note**: docker-compose loads only the path supplied via `SERVICE_ENV_FILE`. `make docker` sets this to `.env.docker`, so update that file with any local secrets you need. Production `.env` remains untouched.
> Without real Supabase credentials the service falls back to the in-memory/no-op vector store, but the database still starts for integration tests via psql.

## Integration Test Loop

1. `make docker-supabase`
2. Apply migration (as above)
3. `npm run test`
4. `make docker-down`

## Useful Commands

- `make docker-clean` — stop containers and remove the data volume
- `docker compose logs service` — stream service logs
- `docker compose exec supabase psql -U postgres` — open psql inside container

Refer to `README.md` for the broader development workflow and other documentation.
