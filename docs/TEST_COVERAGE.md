# Test Coverage Roadmap

This document tracks the current test coverage status and outlines the roadmap for achieving ≥85% coverage across the codebase.

## Current Coverage Status

**Last Updated**: 2025-11-07  
**Overall Coverage**: ~11%

### Coverage by Category

| Category        | Lines  | Statements | Functions | Branches | Status     |
| --------------- | ------ | ---------- | --------- | -------- | ---------- |
| **Overall**     | 10.81% | 10.63%     | 9.85%     | 11.2%    | 🔴 Low     |
| Routes          | 49.42% | 49.42%     | 75%       | 51.16%   | 🟡 Partial |
| Utils           | 100%   | 100%       | 100%      | 66.66%   | 🟢 Good    |
| Server          | 0%     | 0%         | 0%        | 0%       | 🔴 None    |
| Google Services | 0%     | 0%         | 0%        | 0%       | 🔴 None    |
| Ingestion       | 0%     | 0%         | 0%        | 0%       | 🔴 None    |
| Embeddings      | 0%     | 0%         | 0%        | 0%       | 🔴 None    |
| Vector Store    | 0%     | 0%         | 0%        | 0%       | 🔴 None    |
| Middleware      | 0%     | 0%         | 0%        | 0%       | 🔴 None    |

## Covered Areas

### ✅ Routes (Partial Coverage)

- **search.ts**: 64.28% - Basic happy path and error handling tested
- **googleDriveWebhook.ts**: 53.19% - Token validation and enqueue tested
- **health.ts**: 0% - Not yet tested
- **docs.ts**: 0% - Not yet tested

### ✅ Utils (Complete Coverage)

- **logger.ts**: 100% - Logger factory fully covered

## Uncovered Areas

### 🔴 Priority: High

#### 1. Vector Store Implementations

**Files**:

- `src/services/supabase/vectorStore.ts` (0%)
- `src/services/supabase/postgresVectorStore.ts` (0%)

**Why Priority High**: Core functionality for document storage and retrieval.

**Test Strategy**:

- Mock Postgres connections and Supabase client
- Test document upsert, chunk upsert, deletion, and querying
- Test connection fallback logic
- Test error handling for database failures

**Estimated Effort**: 5 hours

---

#### 2. Chunking Logic

**File**: `src/ingestion/chunk.ts` (0%)

**Why Priority High**: Critical for document processing quality.

**Test Strategy**:

- Test text chunking with various input sizes
- Test heading detection and hierarchy
- Test metadata extraction (page breaks, headings)
- Test edge cases (empty docs, very large docs, special characters)

**Estimated Effort**: 4 hours

---

#### 3. Embedding Service

**File**: `src/services/embedding/openaiEmbeddingService.ts` (0%)

**Why Priority High**: Core service for vector generation.

**Test Strategy**:

- Mock OpenAI API responses
- Test batch processing logic
- Test error handling and retries
- Test rate limiting
- Test embedding dimension validation

**Estimated Effort**: 3 hours

---

### 🟡 Priority: Medium

#### 4. Ingestion Pipeline

**File**: `src/ingestion/pipeline.ts` (0%)

**Why Priority Medium**: Integration point testing, depends on other components.

**Test Strategy**:

- Integration test with mocked Google Docs and real Supabase
- Test full flow: fetch → chunk → embed → upsert
- Test chunk deletion before upsert
- Test error handling at each stage

**Estimated Effort**: 6 hours
**Dependencies**: Test coverage for chunk.ts and embedding service

---

#### 5. Google Services

**Files**:

- `src/google/docsService.ts` (0%)
- `src/google/serviceAccount.ts` (0%)

**Why Priority Medium**: External API integration, can be mocked effectively.

**Test Strategy**:

- Mock Google API responses
- Test document fetching with various formats
- Test authentication flow
- Test error handling (auth failures, missing docs, API errors)

**Estimated Effort**: 4 hours

---

#### 6. HTTP Server & E2E

**File**: `src/server.ts` (0%)

**Why Priority Medium**: Integration testing, covered by E2E tests.

**Test Strategy**:

- Use supertest for HTTP testing
- Test request routing to correct handlers
- Test error handling middleware
- Test JSON parsing
- Test 404 handling
- Test CORS if applicable

**Estimated Effort**: 5 hours

---

### 🟢 Priority: Low

#### 7. Remaining Route Handlers

**Files**:

- `src/routes/health.ts` (0%)
- `src/routes/docs.ts` (0%)

**Why Priority Low**: Simple handlers with minimal logic.

**Test Strategy**:

- Test health endpoint returns 200 with correct JSON
- Test docs endpoint serves OpenAPI spec
- Test error cases

**Estimated Effort**: 2 hours

---

#### 8. Error Handler Middleware

**File**: `src/middleware/errorHandler.ts` (0%)

**Why Priority Low**: Simple middleware, but should be tested.

**Test Strategy**:

- Test error catching from handlers
- Test error logging
- Test error response formatting
- Test different error types (validation, system, not found)

**Estimated Effort**: 2 hours

---

## Coverage Goals

### Short Term (1-2 weeks)

- **Target**: 50% overall coverage
- **Focus**: High priority items (Vector Store, Chunking, Embeddings)
- **Tests to Add**: ~12 test files

### Medium Term (1 month)

- **Target**: 75% overall coverage
- **Focus**: Medium priority items (Pipeline, Google Services, Server)
- **Tests to Add**: ~8 test files

### Long Term (2 months)

- **Target**: ≥85% overall coverage
- **Focus**: Low priority items + edge cases
- **Tests to Add**: ~4 test files + edge case expansion

## Test Infrastructure

### Current Setup ✅

- Vitest 4.x with v8 coverage provider
- Unit test configuration (`vitest.config.ts`)
- Integration test configuration (`vitest.integration.config.ts`)
- Docker-based Supabase testing (`make test-with-docker`)
- Supertest installed for HTTP E2E testing
- Coverage exclusions for non-testable files

### Coverage Configuration

The following files are intentionally excluded from coverage:

- Type definitions (`**/types.ts`, `**/*.d.ts`)
- Configuration files (`**/config.ts`)
- OpenAPI specifications (`**/openapi.ts`)
- Bootstrap files (`**/index.ts`)
- Test utilities (`**/testing/**`)

## Getting Started

### Running Tests

```bash
# Run all tests with coverage
npm run test:coverage

# Run unit tests only
make test-unit

# Run integration tests with Docker Supabase
make test-with-docker
```

### Adding New Tests

1. **Unit Tests**: Place in `tests/unit/` with naming `<module>.test.ts`
2. **Integration Tests**: Place in `tests/integration/` with naming `<module>.test.ts`
3. **E2E Tests**: Place in `tests/e2e/` with naming `<feature>.test.ts`

### Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Module Name", () => {
  it("should handle expected behavior", () => {
    // Arrange
    const input = setupTestData();

    // Act
    const result = moduleFunction(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

## Related Documentation

- [Testing Playbook](./TESTING.md) - How to run tests locally and in CI
- [Architecture](./ARCHITECTURE.md) - System architecture and component overview
- [Supabase Operations](./SUPABASE_OPERATIONS.md) - Database testing setup

## Tracking

Track test coverage tasks in `.todo/tasks.json`. Each task includes:

- Unique ID
- Description and test strategy
- Priority level
- Estimated hours
- Dependencies
- Files to create/modify

Run `npm run test:coverage` after adding tests to verify coverage improvements.
