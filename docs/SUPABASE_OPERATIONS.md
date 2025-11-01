# Supabase Operations Guide

This document covers schema management, migrations, and operational practices for the Supabase backing store.

## Schema Overview

`infra/supabase/0001_init.sql` provisions:

- `documents` — metadata about each indexed document.
- `document_chunks` — pgvector-powered text chunks with embeddings.
- `match_document_chunks` — RPC returning top-k matches for a query embedding.
- ivfflat index on `document_chunks.embedding` to speed up similarity search.

Keep the embedding dimension (`vector(1536)`) aligned with the embedding model output you use.

## Applying Migrations

### Manual

```bash
psql "$SUPABASE_URL" -f infra/supabase/0001_init.sql
```

Alternatively, use the Supabase SQL editor and paste the file contents. Ensure you run migrations in a transaction when adding new files.

### Automated

- Store migrations in `infra/supabase/` sequentially (`0002_add_whatever.sql`).
- Use a migration tool (e.g., `tern`, `dbmate`, or Supabase CLI) in CI/CD to apply migrations before deploying application updates.

## Local Testing

- Set up a local Postgres instance with pgvector (e.g., via Docker). Example `docker-compose` snippet:
  ```yaml
  services:
    supabase:
      image: supabase/postgres:15.1.0.92
      environment:
        - POSTGRES_PASSWORD=postgres
      ports:
        - "54322:5432"
  ```
- Run migrations against the local instance, then export:
  ```bash
  export SUPABASE_TEST_URL=postgresql://postgres:postgres@localhost:54322/postgres
  export SUPABASE_TEST_SERVICE_ROLE_KEY=postgres
  npm run test
  ```
  The integration suite in `src/services/supabase/__tests__/` will exercise real queries.

## Operational Best Practices

- **Connection pooling**: Use PgBouncer or Supabase’s built-in pooling when multiple service replicas run to avoid exceeding connection limits.
- **Resource sizing**: Vector indexes grow with the number of chunks; monitor disk and memory usage. Adjust `lists` and `probes` on the ivfflat index for performance tuning.
- **Backups**: Supabase provides automated backups; schedule exports before large migrations. For self-hosted Postgres, use `pg_dump` or managed backups.
- **Security**: Limit exposure of the service-role key. Only the ingestion service should use it. For read-only clients, create dedicated Postgres roles or rely on Supabase’s anon key + RLS.
- **Monitoring**: Enable query logging and monitor `match_document_chunks` latency. Consider adding custom metrics (query count, ingestion duration) via application logs.

## Schema Changes & Rollbacks

1. Create a new migration file (e.g., `0002_add_metadata_index.sql`).
2. Run it on staging first, verify the service still passes `npm run test` with integration env vars.
3. Tag releases after successful deployment. In case of issues, revert by applying a rollback migration or restoring from backup.

## Changing Embedding Dimensions

If you switch embedding models with different vector sizes:

1. Pause ingestion.
2. Create a migration to drop/recreate the `embedding` column and index with the new dimension.
3. Update `SUPABASE_EMBEDDING_DIMENSIONS` and redeploy the service.
4. Re-ingest existing documents to repopulate embeddings.

## Troubleshooting

| Issue                                             | Resolution                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Supabase credentials are not configured` warning | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars.                                                                     |
| `embedding length does not match` error           | Ensure `SUPABASE_EMBEDDING_DIMENSIONS` matches the embedding model output.                                                         |
| Slow queries                                      | Recreate ivfflat index with higher `lists`, analyze table, or increase compute tier.                                               |
| RPC missing                                       | Apply migrations; verify the function name matches `SUPABASE_MATCH_FUNCTION`.                                                      |
| Duplicate chunks                                  | The pipeline deletes old chunks before insert; if duplicates occur, confirm `deleteDocumentChunks` runs (look for errors in logs). |

## Additional Resources

- [Supabase Vector Documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
- [pgvector README](https://github.com/pgvector/pgvector)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for automating migrations.
