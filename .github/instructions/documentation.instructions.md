---
applyTo: '**'
---

# Documentation Best Practices

## Guiding Principles
- Write from the reader's point of view: lead with the task or question they bring.
- Treat documentation as product code—version it, review it, and keep the tone consistent.
- Prefer actionable steps over theory; link to background material rather than duplicating it.

## Planning & Scope
- Keep every doc inside `docs/`; add new folders there rather than scattering Markdown at the repo root.
- Exception: maintain the root-level `AGENTS.md` shim for tooling; keep its content limited to links back into `docs/guides/contributors/`.
- Start each document with a one-line intent statement and an audience note (e.g., "For on-call responders").
- Capture prerequisites up front: required tools, environment variables, access levels.
- Maintain a changelog or "Last reviewed" tag near the top to signal freshness.

## Structure & Navigation
- Use hierarchical headings (`#`, `##`, `###`) to model how a reader drills into detail.
- Keep sections short (3–5 paragraphs max) and use bullet lists for multi-step procedures.
- Surface related docs via inline links; keep the navigation hub `docs/index/README.md` current whenever you add or move files.
### Preferred `docs/` Layout
```
docs/
├── index/                # Navigation hub and cross-links
│   └── README.md         # List of current docs + example trees
├── guides/
│   ├── contributors/     # Onboarding guides, coding standards, workflow primers
│   └── operations/       # Runbooks, on-call procedures, incident response
├── references/
│   ├── api/              # Endpoint specs, OpenAPI, protocol references
│   └── architecture/     # Diagrams, ADRs, high-level system overviews
├── playbooks/            # Deployment, migration, emergency, and maintenance playbooks
└── tutorials/            # Hands-on walkthroughs, lab exercises, training material
```

When adding a new doc, choose the closest matching folder; create a subfolder only if multiple related docs need grouping. Update `docs/index/README.md` with a short description and link for each new page.

## Writing Style
- Prefer present tense and active voice ("Run `npm test`" not "`npm test` should be run").
- Spell out acronyms on first use and provide short definitions for domain-specific terms.
- Show examples alongside commands; annotate them with expected output or verification steps.

## Formatting & Tooling
- Wrap code snippets in fenced blocks with language hints (```ts```, ```bash```).
- Limit line length to ~120 characters so diffs stay readable in GitHub and VS Code.
- Run the repo's formatter (`npm run format` or `prettier --write`) before committing edited Markdown.
- Express dates in British day-month-year order (e.g., `12 August 2024`) and times in 24-hour format (e.g., `16:30`).

## Maintenance Workflow
- Pair major doc changes with the relevant code PR so reviewers validate both together.
- Set calendar reminders or ownership rotations to revalidate operational runbooks at least quarterly.
- When removing features, delete or update the docs in the same PR to prevent stale guidance.
- Before pushing code for any new feature or behaviour change, ensure the corresponding documentation is updated in the same branch.
