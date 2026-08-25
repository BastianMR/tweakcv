# Implementation Plan: TweakCV MVP — Personal CV Database & ATS-Tailored CV Studio

**Branch**: `001-tweakcv-mvp` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tweakcv-mvp/spec.md`

## Summary

App local open-source donde una persona construye su base de datos profesional personal, la puebla por ingesta asistida de IA (diplomas, CVs, tests de strengths), e ingresa postulaciones (texto o imagen) para generar CVs adaptados al puesto — optimizados para parsers ATS y legibles por agentes de IA — con evaluación de ajuste puntuable e historial versionado reproducible.

Enfoque técnico: un solo paquete npm con SPA React + servidor HTTP Hono sobre Node 22, SQLite embebido como almacenamiento local, export PDF vía headless Chrome (HTML+print-CSS), y adaptador LLM OpenAI-compatible con salidas schema-validadas (zod) y human-in-the-loop en toda escritura derivada de IA.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js ≥ 22 LTS (floor impuesto por ABI de dependencias; constitution v1.0.1)

**Primary Dependencies**:
| Paquete | Versión | Rol |
|---|---|---|
| vite + @vitejs/plugin-react | ^8 / ^6 | Build + dev server SPA |
| react | ^19 | UI |
| hono + @hono/node-server | ^4 / ^2 | API HTTP + serve estático |
| better-sqlite3 | ^13 | DB embebida (prebuilds, sin node-gyp) |
| zod | ^4 | Validación compartida: routes + AI output + contratos |
| openai (SDK) | ^7 | Cliente LLM con `baseURL` configurable |
| puppeteer | ^25 | HTML→PDF (Chrome for Testing auto-descargado) |
| @tanstack/react-query | ^5 | Cache REST client-side |
| ajv + @jsonresume/schema | latest | Validación import/export JSON Resume |
| vitest / @playwright/test | ^4 / ^1.62 | Testing |

**Storage**: SQLite en archivo local `data/tweakcv.db` (migraciones `.sql` numeradas trackeadas con `PRAGMA user_version`); binarios subidos en `data/uploads/`; todo bajo `data/` gitignored.

**Testing**: Vitest (unit + integration, SQLite temporal por test) + Playwright E2E contra app compilada servida por Hono (puede reusar Chrome del sistema).

**Target Platform**: Navegador desktop (Windows/macOS/Linux) contra proceso local; instalación vía `npm install && npm run dev`.

**Project Type**: Local web application — single package, client + server co-ubicados.

**Performance Goals**: SC-008 — operaciones locales <1s; export PDF <10s; ambos excluyendo latencia del servicio de IA externo.

**Constraints**: Datos 100% locales (única red = endpoint IA configurado por el usuario); cero telemetría; API keys solo en archivos gitignored; human-in-the-loop obligatorio en escrituras derivadas de IA; i18n ES/EN desde día 1.

**Scale/Scope**: Usuario único por instalación; orden de cientos de documentos/CVs versionados; 4 user stories, 25 FRs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Estado | Evidencia |
|---|---|---|
| I — YAGNI / mínimas deps | ✅ Pass | Cada dependencia tiene rol único justificado; sin ORM (SQL directo), i18n módulo propio mínimo, sin state manager global |
| I — Cero comentarios | ✅ Pass | Regla en AGENTS.md + tasks lo refuerzan |
| II — TDD + evidencia | ✅ Pass | Tasks con ciclo rojo→verde; gates de verificación por task |
| II — Root cause antes que patch | ✅ Pass | N/A en plan; aplica en implement |
| III — Flujo SDD | ✅ Pass | spec.md → clarify → plan → tasks → implement → converge |
| IV — Sin commits no pedidos | ✅ Pass | Repo inicializado sin commits; se comitea solo a pedido |
| V — Stack registrado | ✅ Pass | Coincide con constitution v1.0.1 (Node floor enmendado con justificación ABI) |
| VI — Test runner + comandos | ⚠️ Pendiente | Comandos definidos en este plan; se materializan al crear package.json (task T1) |
| VII — Conventional Commits + estructura | ✅ Pass | Estructura abajo; restricciones de privacidad heredadas a FRs |

Sin violaciones que justifiquen entrada en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-tweakcv-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # Contrato REST cliente↔servidor
│   ├── ai-prompts.md    # Contrato de operaciones LLM (I/O schemas)
│   └── json-resume-mapping.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
package.json            # scripts: dev / build / start / test / lint / typecheck
vite.config.ts          # proxy /api → Hono en dev
tsconfig.json
src/
├── client/                     # SPA React
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── pages/              # Profile, Documents, Postings, Studio(generate+evaluate), History, Settings, Onboarding
│       ├── components/         # DocumentTable (grilla Notion-like), SlideOverPanel (propiedades inline), DiffReview, ScoreReport...
│       ├── api/                # cliente fetch tipado + TanStack Query hooks
│       └── i18n/               # diccionarios ES/EN tipados (módulo propio minimal)
├── shared/                     # tipos + schemas zod compartidos client/server
│   └── schemas/                # profile, document, posting, cv, assessment, settings
└── server/
    ├── index.ts                # bootstrap Hono: /api/* + serveStatic dist + SPA fallback
    ├── routes/                 # profiles, documents, postings, cvs, assessments, settings
    ├── ai/                     # llm client (openai SDK baseURL), prompts/, ops: extractDocument|parsePosting|tailorCv|evaluateCv
    ├── ats/                    # motor determinista de reglas ATS (pure functions)
    ├── pdf/                    # render template HTML + print CSS → Puppeteer
    ├── resumeio/               # mapping interno ↔ JSON Resume (+ ajv)
    └── db/                     # connection (better-sqlite3), migrations/*.sql (user_version), repositories/
templates/cv/                   # template ATS-safe único (HTML + print CSS)
tests/
├── unit/                       # ats engine, zod schemas, resume mapping, i18n
├── integration/                # routes contra SQLite temporal, pdf smoke
└── e2e/                        # Playwright happy path completo
data/                           # runtime gitignored: tweakcv.db, uploads/, logs/
docs/superpowers/               # specs/plans superpowers si aplican
```

**Structure Decision**: Single package estilo "web application" colapsado: `src/client` + `src/server` + `src/shared` en un repo/paquete único (sin workspaces). En dev corre Vite (SPA) + Hono (API) con proxy; en producción (`npm start`) Hono sirve el build estático y la API desde un proceso. Evita monorepo-tooling sin perder separación de capas.
