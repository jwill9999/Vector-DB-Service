# Deployment Playbook

This playbook outlines how to package, configure, and deploy the ingestion service across environments.

## Packaging

1. **Build**: `npm run build` generates `dist/` with compiled ESM output.
2. **Docker image**:

   ```dockerfile
   FROM node:20-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --omit=dev
   COPY dist ./dist
   COPY package.json ./package.json
   CMD ["node", "dist/index.js"]
   ```

   Build with `docker build -t your-org/vectordb-service:TAG .`.

3. **Artifacts**: Keep `infra/supabase/*` alongside deployment pipelines so migrations run before app rollout.

## Environment Types

| Environment | Purpose                | Notes                                                                             |
| ----------- | ---------------------- | --------------------------------------------------------------------------------- |
| Development | Sandbox for engineers  | Use `make dev`, local tunnels for Drive notifications.                            |
| Staging     | Full integration tests | Mirror production config; run migrations, enable Drive watch on a staging folder. |
| Production  | Live workload          | High availability, autoscaling, monitoring, and secure secrets.                   |

## Configuration Management

- Store secrets in a managed vault (AWS Secrets Manager, GCP Secret Manager, Vault). Map names to the `.env` keys used locally.
- For Kubernetes, use `Secret` + `ConfigMap` mounted as env vars. For serverless (Cloud Run/Fargate), configure environment variables directly in the service definition.

## Infrastructure Patterns

### API Gateway + Container Service

1. Deploy the container to AWS ECS/Fargate or GCP Cloud Run.
2. Front it with API Gateway / HTTPS Load Balancer. Configure route `/webhooks/google-drive` and `/search`.
3. Attach WAF for webhook protection, rate limits, and optional auth.

### Kubernetes

1. Package as a Deployment + Service.
2. Use an Ingress Controller (NGINX, Traefik, GCLB) for HTTPS termination.
3. Configure horizontal pod autoscaling based on CPU or custom metrics (e.g., queue depth).

### Serverless

- Convert handlers to AWS Lambda / Google Cloud Functions if desired. Use API Gateway/Cloud Endpoints to provide HTTP routing. Supabase client and Google SDKs are compatible with serverless runtimes.

## CI/CD Pipeline

Recommended stages:

1. **Lint & Test**: `npm run lint`, `npm run test` (with Supabase test env).
2. **Migrations**: Apply SQL files to the target database (run in staging first).
3. **Build Image**: Generate Docker image, push to registry.
4. **Deploy**: Update infrastructure (Terraform, Serverless Framework, Helm) and roll out the new image.
5. **Post-Deploy Checks**: Hit `/healthz`, run a smoke ingestion (replay a sample webhook) to ensure data flows to Supabase.

## Observability

- **Logging**: Pipe stdout/stderr to centralized logging. Tag logs with request IDs from Google headers if available.
- **Metrics**: Track ingestion duration, embedding latency, Supabase query timing. Tools: Prometheus, Cloud Monitoring, Datadog.
- **Alerts**: Notify on repeated ingestion failures, Supabase RPC errors, or missing webhook traffic.

## Disaster Recovery

- Maintain backups of Supabase (managed backups or `pg_dump`).
- Recreate Google Drive watches if the endpoint changes; keep automation to stop old channels.
- Store deployment manifests and `.env.example` in version control. Document manual failover steps (e.g., switch to backup Supabase instance).

## Runbook Checklist

- [ ] Secrets configured for environment
- [ ] Supabase migration applied
- [ ] Service deployed and `/healthz` green
- [ ] Google Drive watch/channel active
- [ ] Smoke test doc ingested and available via `/search`
- [ ] Monitoring dashboards/alerts verified
