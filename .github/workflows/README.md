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

## Security Scanning

### 🔒 CodeQL Security Analysis

**Note:** This repository uses GitHub's **default CodeQL setup** for security scanning, which is enabled in repository settings under **Code security and analysis**.

The default setup:

- Automatically scans TypeScript/JavaScript code for security vulnerabilities
- Runs on every push and pull request
- Updates automatically with new security rules from GitHub
- Requires no workflow file or configuration
- Results available in the GitHub Security tab

**No custom workflow needed** - GitHub manages this automatically.

## Dependabot

Dependabot is configured to:

- Update npm dependencies weekly (Mondays at 09:00)
- Update GitHub Actions monthly
- Limit to 10 open PRs
- Auto-label with `dependencies` and tag type
- Use conventional commit messages

## Setup Requirements

### Codecov

Code coverage reporting is integrated into the CI workflow and displays a badge on the README.

**Setup Requirements:**

1. Sign up at [codecov.io](https://codecov.io) and connect your GitHub repository
2. Add `CODECOV_TOKEN` to repository secrets:
   - Go to Repository Settings → Secrets and variables → Actions
   - Add a new secret named `CODECOV_TOKEN`
   - Copy the token from your Codecov dashboard (Settings → Global Upload Token)
3. The coverage badge will update automatically after each CI run on the main branch

**Badge URL:** The Codecov badge in README.md displays the current coverage percentage and links to detailed coverage reports.

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

The following badges are displayed in README.md and update automatically:

**CI Workflow:**

```markdown
[![CI](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/ci.yml/badge.svg)](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/ci.yml)
```

**Code Coverage:**

```markdown
[![codecov](https://codecov.io/gh/jwill9999/Vector-DB-Service/graph/badge.svg)](https://codecov.io/gh/jwill9999/Vector-DB-Service)
```

These badges are already included in the README and will display:

- **CI Badge**: Shows the status of the latest CI workflow run across all branches (passing/failing)
- **Codecov Badge**: Shows the current code coverage percentage (requires CODECOV_TOKEN to be configured and repository setup on Codecov)
