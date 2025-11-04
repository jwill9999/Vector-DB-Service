# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Vector-DB-Service project.

## Workflows

### 🔄 CI (`ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**

- **Lint and Format Check**: Runs ESLint and Prettier format validation
- **Build**: Compiles TypeScript to JavaScript, uploads build artifacts
- **Unit Tests**: Runs test suite with coverage reporting, uploads to Codecov
- **Integration Tests**: Runs Docker-based integration tests with Supabase
- **Type Check**: Validates TypeScript types without emitting files

**Artifacts:**

- Build output (`dist/`) - 1 day retention
- Coverage reports - 7 days retention

### ✅ PR Checks (`pr-checks.yml`)

**Triggers:** Pull Request events (opened, synchronize, reopened)

**Jobs:**

- **PR Validation**:
  - Verifies build doesn't produce uncommitted changes
  - Checks for console.log/debug in source code (enforces structured logging)
  - Validates package-lock.json is up to date
- **Bundle Size Check**: Reports bundle size and warns if > 10MB
- **Dependency Audit**: Runs `npm audit` and checks for outdated packages

### 🔒 CodeQL Security Analysis (`codeql.yml`)

**Triggers:** Push to main/develop, PRs, Weekly schedule (Monday 00:00 UTC)

**Jobs:**

- **Security Analysis**: Scans code for security vulnerabilities using CodeQL
- Runs both security and quality queries
- Results available in GitHub Security tab

## Dependabot

Dependabot is configured to:

- Update npm dependencies weekly (Mondays at 09:00)
- Update GitHub Actions monthly
- Limit to 10 open PRs
- Auto-label with `dependencies` and tag type
- Use conventional commit messages

## Setup Requirements

### Codecov (Optional)

To enable coverage reporting:

1. Sign up at [codecov.io](https://codecov.io)
2. Add `CODECOV_TOKEN` to repository secrets

### Branch Protection Rules (Recommended)

Configure on `main` branch:

- Require status checks to pass:
  - `Lint and Format Check`
  - `Build`
  - `Unit Tests`
  - `TypeScript Type Check`
- Require PR reviews before merging
- Require linear history

## Running Workflows Locally

### Lint and Format

```bash
npm run lint
npm run format:check
```

### Build

```bash
npm run build
```

### Tests

```bash
# Unit tests
npm test

# Integration tests with Docker
make test-with-docker
```

### Type Check

```bash
npx tsc --noEmit
```

## Workflow Status Badges

Add to README.md:

```markdown
[![CI](https://github.com/jwill9999/Vector-DB-Service/workflows/CI/badge.svg)](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jwill9999/Vector-DB-Service/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/jwill9999/Vector-DB-Service/branch/main/graph/badge.svg)](https://codecov.io/gh/jwill9999/Vector-DB-Service)
```
