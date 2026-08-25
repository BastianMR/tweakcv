# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

Local open-source app to build your personal CV database and generate ATS-optimized tailored CVs with your own AI

## Commands

- Install: `npm install` (requires Node >= 22; approves native/Chrome install scripts on first run)
- Dev: `npm run dev` (API :3001 + Vite :5173)
- Test: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`

## Architecture notes

- Single npm package: `src/client` (React SPA), `src/server` (Hono), `src/shared` (zod schemas)
- SQLite via better-sqlite3 (prebuilt per-platform binaries; no VS C++ toolchain needed)
- PDF export via Puppeteer (headless Chrome auto-downloaded on install)
- AI calls through `src/server/ai/client.ts`: OpenAI-compatible baseURL from user settings; provider `mock` for deterministic tests
- Runtime data under `data/` (gitignored): DB, uploads, logs, credentials.json


## Conventions

- Follow existing code style; run the formatter before committing.
- Keep changes minimal and focused on the task at hand.
- Never commit secrets, credentials, or generated artifacts.
- Add user-facing changes under `[Unreleased]` in CHANGELOG.md.

## Knowledge graph (graphify)

This project has a knowledge graph at `graphify-out/` (god nodes, communities, cross-file relationships).

- For codebase questions, run `graphify query "<question>"` first when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for concepts.
- Use `graphify-out/wiki/index.md` for broad navigation if present; read `GRAPH_REPORT.md` only for architecture reviews or when query/path/explain fall short.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
