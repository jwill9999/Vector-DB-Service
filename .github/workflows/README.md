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

**Triggers:** Push to `main`/`develop`, Pull Requests targeting `main`/`develop`, weekly schedule (Monday 06:00 UTC)

**Jobs:**

- **Analyze**: Runs GitHub's CodeQL engine against the TypeScript/JavaScript source using the `security-extended` query suite

This workflow provides an **explicit, file-based CodeQL configuration** so that code scanning results are always produced for the target branches — independent of the repository-level "default setup" toggle in GitHub Settings.

Results are surfaced in the **GitHub Security → Code scanning alerts** tab.

**Permissions required (granted by the workflow):**

| Permission       | Reason                                    |
| ---------------- | ----------------------------------------- |
| `contents: read` | Checkout source code                      |
| `actions: read`  | Read workflow metadata during analysis    |
| `security-events: write` | Upload SARIF results to GitHub  |

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

### Branch Protection Rules (Required)

Configure on `main` **and** `develop` branches (Settings → Branches → Branch protection rules):

- **Require status checks to pass before merging:**
  - `Lint and Format Check`
  - `Build`
  - `Unit Tests`
  - `TypeScript Type Check`
  - `Analyze (javascript-typescript)` ← CodeQL scan
- **Require signed commits** — ensures every commit pushed directly or merged into the branch carries a verified GPG/SSH/S/MIME signature
- Require PR reviews before merging
- Require linear history

> **Note on signed commits:** GitHub Actions commits (e.g., automated dependency bumps via `GITHUB_TOKEN`) are automatically verified by GitHub. Developer commits must be signed locally with a GPG or SSH key registered in GitHub account settings.

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

**CodeQL Security Analysis:**

```markdown
[![CodeQL](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/codeql.yml/badge.svg)](https://github.com/jwill9999/Vector-DB-Service/actions/workflows/codeql.yml)
```

These badges are already included in the README and will display:

- **CI Badge**: Shows the status of the latest CI workflow run across all branches (passing/failing)
- **Codecov Badge**: Shows the current code coverage percentage (requires CODECOV_TOKEN to be configured and repository setup on Codecov)
- **CodeQL Badge**: Shows whether the latest code scanning analysis passed (security vulnerabilities found/none)
