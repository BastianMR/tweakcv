# Research: TweakCV MVP

**Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md) | Versiones verificadas en vivo contra npm registry (ago 2026).

## D1 — Framework HTTP: Hono ^4 + @hono/node-server ^2 (4.13.3 / 2.1.1)

- **Rationale**: TS-first, liviano, `serveStatic` incluido, middleware suficiente para app local.
- **Alternatives**: Express (más viejo, tipado peor), Fastify (más pesado en plugins para el caso).
- **Gotchas**: `serveStatic({ root })` resuelve relativo a CWD → correr desde project root o pasar path absoluto; SPA fallback manual vía `onNotFound` → `index.html`; tras proxy de Vite no requiere nada especial.

## D2 — Acceso a datos: better-sqlite3 ^13 (13.0.3), SQL directo, migraciones numeradas

- **Rationale**: API sync simple, prebuilds por plataforma (sin node-gyp en Windows limpio), publicado desde Node 24.
- **Alternatives**: Drizzle/Kysely (capa extra injustificada para ~9 tablas — se revisita si crecen queries), Prisma (runtime pesado, overkill local).
- **Migrations**: archivos `.sql` numerados aplicados en una transacción; tracking con `PRAGMA user_version`.
- **Gotchas**: exige Node ≥22 (origen del amendment de constitution a 1.0.1); pin major por ABI.

## D3 — PDF: Puppeteer ^25 (25.8.0) con Chrome for Testing auto-descargado

- **Rationale**: cero configuración en instalación local Windows/macOS/Linux; layout = HTML+CSS que ya usamos para preview WYSIWYG.
- **Alternatives**: playwright-core + Chrome del sistema (cero descarga ~170MB, opción documentada si usuarios se quejan de footprint); pdf-lib/react-pdf (layout programático, pierde CSS); @sparticuz/chromium (serverless-only, descartado).
- **Gotchas**: ~450–500MB instalados bajo `%USERPROFILE%\.cache\puppeteer`; documentar requisito de disco en README; E2E puede reusar ese mismo Chrome.

## D4 — Cliente LLM: openai SDK ^7 (7.5.0) con `baseURL` configurable

- **Rationale**: patrón oficial soportado por Groq, OpenRouter y Ollama (`http://localhost:11434/v1`); un solo cliente cubre presets + custom.
- **Structured outputs**: `response_format:{type:'json_schema',json_schema:{name,schema,strict:true}}`. Ollama local lo soporta; Ollama Cloud NO → siempre re-validar JSON server-side con zod y reintentar una vez ante schema mismatch (FR-023).
- **Vision**: `{type:'image_url',image_url:{url:'data:image/jpeg;base64,…'}}` estándar; detección de capacidad de visión del modelo → warning previo si se sube imagen (edge case de spec).

## D5 — Validación: zod ^4 como único lenguaje de schemas

- **Rationale**: mismos schemas para: contratos REST (parse en routes), outputs LLM (validación post-generación), formularios client. Una sola fuente de verdad en `src/shared/schemas/`.

## D6 — i18n: módulo propio minimalista (diccionarios ES/EN tipados)

- **Rationale**: YAGNI — ~50 LOC cubren diccionario plano + interpolación; sin dependencia ni config.
- **Alternatives**: react-i18next (estándar reconocible para contribuidores) — swap documentado como evolución si aparece pluralización ICU/namespaces.

## D7 — Data fetching client: TanStack Query ^5 (5.102.0)

- **Rationale**: cache/invalidación/optimistic updates resuelven exactamente los bugs típicos de la grilla editable + slide-over; peer react 19 OK.

## D8 — Build/dev orchestration: Vite ^8 (8.2.2, Rolldown) + plugin-react ^6, proxy `/api`

- **Dev**: `concurrently` levanta Hono (:3001) y Vite (:5173) con `server.proxy` de `/api`.
- **Prod**: `npm run build` → Vite compila SPA a `dist/client`; `npm start` sirve Hono en :3000 con serveStatic + fallback.
- **Gotcha**: Vite 8 ya es estable (6/7 quedaron atrás dos majors); engines `^20.19 || >=22.12`.

## D9 — JSON Resume: bundle de schema + ajv

- **Rationale**: `@jsonresume/schema@1.2.1` (MIT confirmado) valida imports; export mapea modelo interno → subset JSON Resume + campos extra preservados en bloque extensión.
- Ver mapping completo en [contracts/json-resume-mapping.md](./contracts/json-resume-mapping.md).

## D10 — Testing: Vitest ^4 (4.1.11) + Playwright 1.62

- Unit/integration: SQLite en archivo temporal por test (aislación total, sin mocks de DB).
- E2E: contra app compilada servida por Hono; browser-mode de Vitest NO se usa (separó providers en paquetes propios, innecesario acá).

## NEEDS CLARIFICATION resueltos

Ninguno pendiente — todos los unknowns técnicos cerrados arriba.
