# Documentation Instructions

This document provides guidelines for creating and maintaining documentation in the Vector-DB-Service repository.

## Documentation Structure

All documentation files are stored in the `docs/` directory at the root of the repository. Documentation follows a consistent structure and naming convention.

### File Naming Convention
- Use `SCREAMING_SNAKE_CASE.md` for all documentation files (e.g., `TEST_COVERAGE.md`, `API_REFERENCE.md`)
- Keep filenames descriptive and specific to their content
- Avoid abbreviations unless widely recognized (API, HTTP, E2E)

### Standard Documentation Categories

1. **Architecture & Design**
   - `ARCHITECTURE.md` - System architecture and component overview
   - `SERVICE_FLOW.md` - Data flow diagrams and sequence diagrams

2. **Operations & Deployment**
   - `DEPLOYMENT_PLAYBOOK.md` - Production deployment guide
   - `SUPABASE_OPERATIONS.md` - Database operations and maintenance
   - `LOCAL_DOCKER.md` - Local development with Docker

3. **Development Guides**
   - `TESTING.md` - Testing strategies and how to run tests
   - `TEST_COVERAGE.md` - Coverage tracking and roadmap
   - `API_REFERENCE.md` - HTTP endpoint documentation

4. **Integration Guides**
   - `GOOGLE_DRIVE_WATCH.md` - Setting up Google Drive webhooks

## Document Structure Template

Every documentation file should follow this structure:

```markdown
# [Document Title]

[1-2 sentence overview of what this document covers]

## [Major Section 1]

[Content with clear subsections]

### [Subsection]

[Detailed content]

## Related Documentation

- [Link to related doc](./OTHER_DOC.md) - Brief description
- [External resource](https://example.com) - Brief description
```

### Required Sections

1. **Title** (H1): Clear, descriptive title
2. **Overview**: Brief introduction (2-3 sentences max)
3. **Main Content**: Organized with H2 and H3 headers
4. **Related Documentation**: Links to related docs at the end

### Optional Sections

- **Prerequisites**: List requirements before following the guide
- **Quick Start**: Fast path for experienced users
- **Troubleshooting**: Common issues and solutions
- **Examples**: Code samples or command examples

## Writing Style Guidelines

### Tone and Voice
- Write in **clear, concise technical prose**
- Use **second person** ("you") for instructions: "Run `npm test` to execute tests"
- Use **imperative mood** for commands: "Install dependencies" not "You should install dependencies"
- Be **specific and actionable**: Provide exact commands, not vague descriptions

### Formatting Standards

#### Code Blocks
Always specify the language for syntax highlighting:

```bash
# Shell commands
npm run build
```

```typescript
// TypeScript code
const result = await service.fetch();
```

```json
// JSON configuration
{
  "key": "value"
}
```

#### Lists
- Use **bullet lists** for unordered items
- Use **numbered lists** for sequential steps
- Keep list items parallel in structure
- Use sub-bullets sparingly (max 2 levels)

#### Tables
Use tables for structured comparisons:

| Feature | Description | Status |
|---------|-------------|--------|
| Search | Vector search | ✅ Done |
| Ingest | Doc ingestion | ✅ Done |

#### Emphasis
- Use `inline code` for: commands, file paths, function names, environment variables
- Use **bold** for: important concepts, warnings
- Use *italics* sparingly for: emphasis within sentences
- Use > blockquotes for: notes, warnings, tips

#### Links
- Use descriptive link text: `[Testing Guide](./TESTING.md)` not `[click here](./TESTING.md)`
- Link to related docs at section end under "Related Documentation"
- Use relative paths for internal docs: `./OTHER_DOC.md`
- Use absolute URLs for external resources

## Documentation Types

### 1. Playbooks (How-To Guides)

**Purpose**: Step-by-step instructions for completing a specific task

**Structure**:
```markdown
# [Task] Playbook

Brief overview of what will be accomplished.

## Prerequisites
- List of requirements
- Tools needed

## Steps

1. First action
   ```bash
   command example
   ```
2. Second action
3. Verification step

## Troubleshooting
- **Issue**: Description
  - **Solution**: Fix

## Related Documentation
```

**Example**: `DEPLOYMENT_PLAYBOOK.md`, `GOOGLE_DRIVE_WATCH.md`

---

### 2. Reference Documentation

**Purpose**: Comprehensive information lookup (APIs, configurations)

**Structure**:
```markdown
# [Component] Reference

Overview paragraph.

## [Section Name]

Detailed technical information.

### [Subsection]

Specific details with examples.

## Related Documentation
```

**Example**: `API_REFERENCE.md`, `SUPABASE_OPERATIONS.md`

---

### 3. Conceptual Documentation

**Purpose**: Explain system design, architecture, and concepts

**Structure**:
```markdown
# [Concept] Overview

Introduction to the concept.

## High-Level Flow

Diagram or description of flow.

## Key Components

Description of major parts.

## [Additional Sections]

Deep dives as needed.

## Related Documentation
```

**Example**: `ARCHITECTURE.md`, `SERVICE_FLOW.md`

---

### 4. Progress Tracking Documentation

**Purpose**: Track ongoing work, test coverage, technical debt

**Structure**:
```markdown
# [Area] Roadmap / Status

## Current Status

Summary with metrics.

## [Category] Status

### ✅ Completed
- Item 1
- Item 2

### 🟡 In Progress
- Item 3

### 🔴 Not Started
- Item 4

## Goals

### Short Term
- Goals for 1-2 weeks

### Long Term
- Goals for 1-3 months

## Related Documentation
```

**Example**: `TEST_COVERAGE.md`

---

## Task Tracking System

### Location
Task tracking uses `.todo/tasks.json` at the repository root.

### Task Structure

```json
{
  "tasks": [
    {
      "id": "unique-id-001",
      "title": "Short descriptive title",
      "description": "Detailed description including strategy and approach",
      "priority": "high|medium|low",
      "category": "testing|documentation|feature|bugfix|refactor",
      "status": "todo|in-progress|done|blocked",
      "estimatedHours": 4,
      "dependencies": ["other-task-id"],
      "files": [
        "path/to/file.ts",
        "path/to/test.ts"
      ]
    }
  ]
}
```

### Task ID Convention
Format: `[category]-[subcategory]-[number]`

Examples:
- `test-coverage-001` - First test coverage task
- `docs-api-001` - First API documentation task
- `feature-search-001` - First search feature task

### Task Priorities

- **high**: Critical functionality, blocking issues, security
- **medium**: Important but not blocking, quality improvements
- **low**: Nice to have, minor improvements, polish

### Task Categories

- `testing` - Test creation, coverage improvements
- `documentation` - Documentation writing or updates
- `feature` - New feature development
- `bugfix` - Bug fixes
- `refactor` - Code refactoring
- `infrastructure` - Build, CI/CD, tooling

### Task Status Values

- `todo` - Not started
- `in-progress` - Currently being worked on
- `done` - Completed
- `blocked` - Waiting on dependencies or external factors

## Creating New Documentation

### Before Writing

1. Check if similar documentation exists
2. Determine the appropriate documentation type (playbook, reference, conceptual, progress)
3. Choose a clear, descriptive filename following naming conventions
4. Outline major sections based on the template for that doc type

### While Writing

1. Start with the overview paragraph
2. Use code examples liberally
3. Include troubleshooting for playbooks
4. Add "Related Documentation" section with links
5. Use consistent terminology from existing docs

### After Writing

1. Add link to new doc in `README.md` if it's a primary guide
2. Add links from related docs to the new doc
3. Update table of contents if the doc has many sections
4. Review for: clarity, completeness, formatting consistency
5. Test all commands and code examples

## Updating Existing Documentation

### When to Update

- **Feature changes**: Update docs when code behavior changes
- **New features**: Add sections or create new docs for new functionality
- **Bug fixes**: Update if the fix changes documented behavior
- **Deprecations**: Mark deprecated features clearly
- **Coverage changes**: Update metrics in TEST_COVERAGE.md after adding tests

### How to Update

1. Find all affected documentation files
2. Update content maintaining existing structure
3. Update "Last Updated" dates if present
4. Check for broken links
5. Verify examples still work

### Deprecation Format

When deprecating features:

```markdown
> **⚠️ DEPRECATED**: This feature is deprecated as of [version]. Use [alternative] instead. See [migration guide](./MIGRATION.md).
```

## Documentation Review Checklist

Before committing documentation changes:

- [ ] Filename follows `SCREAMING_SNAKE_CASE.md` convention
- [ ] Document has clear title (H1) and overview
- [ ] Headers use proper hierarchy (H1 → H2 → H3)
- [ ] Code blocks specify language for syntax highlighting
- [ ] Commands and paths use `inline code` formatting
- [ ] Lists are properly formatted and parallel
- [ ] Tables are aligned and complete
- [ ] "Related Documentation" section is present
- [ ] Links use descriptive text and correct paths
- [ ] Examples are tested and working
- [ ] Spelling and grammar checked
- [ ] Consistent terminology with other docs

## Common Patterns

### Command Examples

Always show the full command:

```bash
# Good
cd /home/runner/work/Vector-DB-Service
npm run test:coverage

# Avoid
# Navigate to project and run tests
```

### File Paths

Use absolute paths in examples:

```bash
# Good
cat /home/runner/work/Vector-DB-Service/.env.test

# Avoid  
cat .env.test
```

### Environment Variables

Format as inline code:

```markdown
Set `SUPABASE_URL` in your `.env` file.
```

### Status Indicators

Use emoji consistently:
- ✅ Done/Working/Good
- 🟡 Partial/In Progress/Warning
- 🔴 Not Done/Broken/Error
- ⚠️ Warning/Deprecated
- 💡 Tip/Suggestion
- 🔧 Configuration

## Examples

### Good Documentation Example

```markdown
# Local Docker Workflow

Run the VectorDB service locally using Docker Compose for rapid iteration.

## Prerequisites

- Docker Desktop or Docker Engine installed
- `.env.docker` file created from `.env.example`

## Quick Start

1. Start the stack:
   ```bash
   make docker
   ```

2. Verify services are running:
   ```bash
   docker ps | grep vectordb
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:8080/healthz
   ```

## Troubleshooting

- **Port 8080 already in use**: Change `PORT` in `.env.docker`
- **Database connection fails**: Check Supabase container logs

## Related Documentation

- [Testing Guide](./TESTING.md) - How to test locally
- [Deployment](./DEPLOYMENT_PLAYBOOK.md) - Production setup
```

### Poor Documentation Example (Avoid)

```markdown
# Docker

You can use docker.

Run these:
docker compose up
docker ps

If it doesn't work, check the logs or something.

[click here](./TESTING.md)
```

**Issues**:
- Vague title
- No overview
- No prerequisites
- Commands without context or path
- Vague troubleshooting
- Poor link text

## Maintenance

### Regular Reviews

Documentation should be reviewed:
- **After major features**: Update affected docs
- **Quarterly**: Check for outdated info
- **Before releases**: Ensure accuracy

### Ownership

- All developers are responsible for keeping docs accurate
- PR authors must update docs affected by their changes
- Tech leads review docs during code review

## Questions?

For questions about documentation:
1. Check existing docs for similar patterns
2. Review this guide
3. Ask in PR comments for specific guidance
