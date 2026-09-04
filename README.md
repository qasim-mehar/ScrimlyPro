# ScrimlyPro

PUBG Mobile scrim results → cumulative standings & MVP graphics.

Truth: PRD.md (what) · ERD.md (data) · PLAN.md (build order).

## Prerequisites

Node 20 or 22 LTS.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build / npm test / npm run lint
```

Env: copy `.env.example` → `.env.local`. All optional in C1.1.

## Assumptions

(agent records autonomous decisions here, per chunk)

- **C1.1 — Node version:** installed runtime is Node v25.6.1 (prompt assumed 20/22 LTS). Scaffold, build, and tests all pass on it; flagged for awareness.
- **C1.1 — @types/better-sqlite3:** better-sqlite3 v13 ships no bundled TypeScript declarations; added `@types/better-sqlite3` as a types-only dev dependency to keep TS strict with zero `any` (build fails otherwise).
- **C1.1 — CNA-generated agent files:** create-next-app generated `AGENTS.md` / `CLAUDE.md` (Next.js agent-rule boilerplate, re-added by `next dev` if deleted). Kept as-is.
