# Tasks: TweakCV MVP

**Input**: Design docs de `/specs/001-tweakcv-mvp/` | **Branch**: `001-tweakcv-mvp`
> **Nota de ejecución real (2026-08-24)**: numeración de migraciones efectiva = `0002_settings`, `0003_documents` (documents/imported_entity/assessment), `0004_postings_cvs`. El resto fiel al plan. Estado vivo en `.issues/index.md`.

**Tests**: INCLUIDOS — constitution Article II exige TDD (test rojo → mínimo verde → refactor).

**Organización**: por user story (US1 perfil → US2 ingesta → US3 generación → US4 evaluación).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Crear `package.json` con scripts dev/build/start/test/test:e2e/lint/typecheck y deps pinned según plan.md (hono@^4 + @hono/node-server@^2, better-sqlite3@^13, puppeteer@^25, openai@^7, zod@^4, react@^19, vite@^8 + plugin-react@^6, @tanstack/react-query@^5, ajv + @jsonresume/schema, vitest@^4, playwright, concurrently)
- [x] T002 Configurar `tsconfig.json` strict (paths src/client|server|shared) + agregar `.opencode/`, `data/`, `dist/` a `.gitignore`
- [x] T003 [P] Configurar ESLint flat + Prettier (`eslint.config.js`); scripts lint/typecheck operativos
- [x] T004 Bootstrap `src/server/index.ts`: Hono :3001, `/api/health`, serveStatic dist/client + SPA fallback onNotFound (gotchas research D1)
- [x] T005 Configurar `vite.config.ts` (root src/client, proxy /api→:3001) + `src/client/index.html` + `src/client/src/main.tsx` mínimo renderizando
- [x] T006 Actualizar `.github/workflows/ci.yml` con setup-node@v4 (Node 22), pasos lint+typecheck+test reales
- [x] T007 Actualizar README.md (requisitos Node 22, disk footprint Puppeteer ~500MB, quickstart de 3 comandos) y comandos reales en AGENTS.md

---

## Phase 2: Foundational (bloquea todo user story)

- [x] T008 Framework migraciones en `src/server/db/migrate.ts`: runner de `src/server/db/migrations/*.sql` numerados en una tx, tracking `PRAGMA user_version`; test unitario con SQLite temporal en tests/unit/migrate.test.ts
- [x] T009 Migración inicial `0001_core.sql`: tablas profile, experience, education, skill, project según data-model.md (FKs, CHECKs, unicidad)
- [x] T010 Capa repositorios base `src/server/db/repo.ts` (helpers CRUD tipados por tabla) + conexión singleton mejor-sqlite3 con WAL
- [x] T011 Middleware errores Hono en `src/server/index.ts`: shape `{error:{code,message,detail?}}`, códigos HTTP correctos, sin stack traces al client
- [x] T012 Logger rotativo local `src/server/log.ts` (archivo data/logs/app.log, rotación por tamaño, niveles) + integración con middleware de errores; jamás loguear api_key
- [x] T013 Settings store `src/server/settings.ts`: tabla setting + `data/credentials.json` gitignored (api_key SOLO acá); GET nunca devuelve key
- [x] T014 Cliente LLM `src/server/ai/client.ts`: openai SDK ^7 con baseURL/key/model de settings, preset `mock` que devuelve fixtures deterministas (para tests/E2E sin red), pre-check vision_capable, retry ×1 con backoff, validación zod post-respuesta (contrato ai-prompts.md sección Errores)
- [x] T015 Schemas zod compartidos `src/shared/schemas/*.ts`: profile, experience, education, skill, project (espejan migración 0001); usados por routes y forms
- [x] T016 Shell SPA `src/client/src/main.tsx`+App: react-router, QueryClientProvider, layout con nav (Perfil, Documentos, Postulaciones, Studio, Historial, Ajustes), language switcher ES/EN
- [x] T017 i18n módulo `src/client/src/i18n/`: diccionarios es/en tipados + hook `useT()` + interpolación mínima (research D6); diccionarios iniciales nav/onboarding
- [x] T018 Cliente API tipado `src/client/src/api/client.ts` (fetch wrapper con manejo del error shape) + query hooks base

**Checkpoint**: foundation lista — user stories pueden empezar.

---

## Phase 3: US1 — Base de datos personal (P1) — MVP

**Goal**: CRUD completo del perfil activo persistente. **Independent Test**: crear/editar/borrar cada sección → reload → persiste (quickstart escenario 1).

- [x] T019 [P] [US1] Tests rojos: integración routes profile/collections contra SQLite temporal (tests/integration/us1-profile.test.ts) cubriendo FR-002/003/024
- [x] T020 [US1] Routes `/api/profiles*` y `/api/profile/:coll*` en src/server/routes/profiles.ts + collections.ts (CRUD uniforme, validación zod T015, scope perfil activo)
- [x] T021 [US1] Unicidad skill (profile,lower(name),category) y exactamente-un-activo en activate (tx) — casos en tests T019
- [x] T022 [P] [US1] Página Perfil `src/client/src/pages/Profile.tsx`: secciones editables con forms zod, listas ordenables, badges por categoría de skill, idioma con select CEFR
- [x] T023 [P] [US1] Onboarding `src/client/src/pages/Onboarding.tsx`: primer uso sin perfiles → crear perfil básico + elegir idioma UI (usa settings PUT)
- [x] T024 [US1] Selector de perfil activo en layout (T016) + endpoint activate; verificación E2E smoke del flujo onboarding→perfil en tests/e2e/us1.spec.ts

**Checkpoint**: US1 usable y demostrable sola.

---

## Phase 4: US2 — Ingesta de documentos asistida por IA (P2)

**Goal**: subir documento → extraer IA → revisar en grilla+slide-over → importar aprobado. **Independent Test**: diploma ejemplo → grilla → corrección inline → diff → importado a Education (quickstart 2-4).

- [x] T025 [P] [US2] Migración documents/imported_entity/assessment (real: `0003_documents.sql`) + schemas zod correspondientes en src/shared/schemas/
- [x] T026 [P] [US2] Tests rojos: integration us2-documents (upload→extract(mock)→patch→import preview/import; duplicado propone merge; FR-006 nada escribe sin approve)
- [x] T027 [US2] Op AI extractDocument en src/server/ai/ops/extract-document/ (prompt.md + schema.ts según contrato; ramas por kind: diploma|cv|assessment_result|certificate|transcript|other)
- [x] T028 [US2] Routes /api/documents: POST multipart (límite 25MB→413), guardado data/uploads/, disparo extracción async con state queued|running|done|error en extraction_meta
- [x] T029 [US2] Routes reextract/PATCH/DELETE + orphaned flag en imported_entity al borrar documento (FR-009, FR-010)
- [x] T030 [US2] Import engine: preview diff (create/update/conflicto por campo) + POST import tx que registra imported_entity (routes + src/server/documents/import.ts)
- [x] T031 [P] [US2] Componente DocumentTable (grilla estilo Notion: Documento|Descripción|Datos extraídos|Metadata) con estados pending/reviewed/error visibles — src/client/src/components/DocumentTable.tsx
- [x] T032 [US2] SlideOverPanel editable-inline (propiedades por campo según kind, metadata read-only, acciones Guardar/Re-extraer/Importar/Eliminar) — src/client/src/components/SlideOverPanel.tsx; integra DiffReview modal para aprobar cambios antes de escribir
- [x] T033 [P] [US2] Catálogo assessments recomendados (kolbe/cliftonstrengths/16personalities/disc/mbti/other) estático en src/client/src/data/assessmentCatalog.ts + checklist UI con links oficiales (FR-011)
- [x] T034 [US2] Import JSON Resume: src/server/resumeio/import.ts (ajv contra schema bundled → documento virtual → mismo flujo human-in-the-loop) + dropzone opción "Importar resume.json" (FR-017)
- [x] T035 [US2] E2E us2.spec.ts: upload diploma fixture (mock provider) → corregir → importar → visible en Perfil

**Checkpoint**: US1+US2 funcionan independientes.

---

## Phase 5: US3 — Generación CV desde postulación (P3)

**Goal**: posting texto/imagen → CV adaptado → preview → export PDF/md/json. **Independent Test**: perfil manual + posting pegada → export 3 formatos válidos (quickstart 5).

- [x] T036 [P] [US3] Migración job_posting/generated_cv (+parent_cv_id) (real: `0004_postings_cvs.sql`) + schemas zod
- [x] T037 [P] [US3] Tests rojos: integration us3-generate (parse texto/imagen-mock, generate snapshot inmutable SC-005, export 3 formatos)
- [x] T038 [US3] Op parsePosting en src/server/ai/ops/parse-posting/ + routes /api/postings (POST text|multipart image con pre-check no_vision 422, PATCH corrección)
- [x] T039 [US3] Op tailorCv en src/server/ai/ops/tailor-cv/ (reglas anti-invención + omittedRefs según contrato) + route /api/cvs/generate (snapshot content_json+data_snapshot_json)
- [x] T040 [US3] Template ATS-safe único templates/cv/ats-classic-v1.html.hbs + print CSS (una columna, fuentes estándar, headings canónicos) + renderer en src/server/pdf/render.ts
- [x] T041 [US3] Motor PDF src/server/pdf/export.ts (puppeteer, page.pdf print background off, timeout <10s) + exports md (mismo contenido plano) y json (JSON Resume válido via src/server/resumeio/export.ts + x-tweakcv extension block) → route /api/cvs/:id/export
- [x] T042 [P] [US3] Página Postulaciones: input textarea + upload imagen + editor de parsed_json editable (FR-014) — src/client/src/pages/Postings.tsx
- [x] T043 [US3] Studio page (input posting → generar → preview iframe fiel → botones export) + Historial page (lista snapshots con fecha/posting/score, re-export, delete manual) — src/client/src/pages/Studio.tsx, History.tsx
- [x] T044 [US3] E2E us3.spec.ts (mock): pegar posting → generar → export → validar PDF tiene texto seleccionable y JSON pasa validator

**Checkpoint**: ciclo completo sin evaluación.

---

## Phase 6: US4 — Evaluación ATS e iteración (P4)

**Goal**: score determinista+semántico accionable; iteración versionada. **Independent Test**: keywords conocidas → reporte cubre 100% requisitos con evidencia (SC-004); regeneración idéntica (SC-005).

- [x] T045 [P] [US4] Tests rojos unitarios motor ATS tests/unit/ats-engine.test.ts: cobertura keywords presente/parcial/faltante con evidencia, headings estándar, una columna (por markup), densidad — funciones puras en src/server/ats/engine.ts
- [x] T046 [US4] Op evaluateCv semántica en src/server/ai/ops/evaluate-cv/ (rúbrica ≤criterios del contrato) + route /api/cvs/:id/evaluate combinando mecánica+semántica (default 60/40) → score_json
- [x] T047 [P] [US4] ScoreReport component: total, breakdown, tabla requisitos con evidencia textual y sugerencias accionables — src/client/src/components/ScoreReport.tsx
- [x] T048 [US4] Flujo iteración: desde sugerencia → regenerar crea snapshot hijo (parent_cv_id) preseleccionando corrección; comparador de scores padre/hijo en Historial
- [x] T049 [US4] E2E us4.spec.ts (mock): evaluar → aplicar top suggestion → nuevo snapshot → score componente mejora

**Checkpoint**: las 4 stories completas.

---

## Phase 7: Polish & Cross-cutting

- [x] T050 Diagnósticos: GET /api/system/logs/tail + /api/system/diagnostics (versión, OS, errores recientes, settings SIN key) + botón "Copiar reporte" en Ajustes (FR-025)
- [x] T051 Ajustes page completa: presets proveedor (openai/groq/openrouter/ollama/lmstudio/custom/mock), test-connection con detección vision_capable, warning si modelo sin visión al intentar subir imagen (FR-020, edge case spec)
- [x] T052 Auditoría privacidad: grep CI step que falle si api_key aparece en logs/db dumps; verificar cero telemetría (SC-006) documentado en SECURITY.md
- [x] T053 Performance pass SC-008: medir ops locales <1s y export <10s con script npm run bench; optimizar solo si falla
- [x] T054 Ejecutar quickstart.md escenarios 1-10 manualmente y registrar evidencia; completar CHANGELOG [Unreleased]; README final con screenshots

---

## Dependencies & Execution Order

Phase 1 → Phase 2 → US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4) → Polish.
US2 depende de US1 solo como destino de imports (perfil existe). US3 puede empezar tras Foundational si el usuario carga perfil manual (independiente declarado en spec). US4 requiere US3.

## Parallel Opportunities

Dentro de cada fase: tasks marcados [P]. Entre fases: client (T022-23, T031-33, T042-43, T047) paralelizable con server (routes/AI ops) una vez schemas T015 existen.

## Implementation Strategy

MVP = Setup+Foundational+US1 (demoable: base de datos local). Incremental: +US2 ingesta, +US3 generación (núcleo de producto), +US4 evaluación. Cada checkpoint valida story independiente vía quickstart.

## Notes

- Provider `mock` (T014) hace todos los E2E deterministas sin red ni keys.
- Ningún task commitea: commits solo a pedido explícito (constitution IV).
