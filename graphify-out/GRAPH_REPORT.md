# Graph Report - TweakCV  (2026-08-24)

## Corpus Check
- 145 files · ~53,507 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 893 nodes · 1503 edges · 130 communities (68 shown, 62 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- ai/client.ts
- AGENTS.md Agent Instructions
- useT
- education.ts
- devDependencies
- dependencies
- compilerOptions
- Entidad profile (perfiles, exactamente uno activo)
- pdf/export.ts
- log.ts
- Speckit Full SDD Cycle Workflow
- common.ps1
- Contract: Mapping interno ↔ JSON Resume
- Quickstart: Validación end-to-end TweakCV MVP
- Crud
- Entidad generated_cv (snapshot inmutable, parent_cv_id, score_json)
- Data Model: TweakCV MVP
- create-new-feature.ps1
- getDb
- profile
- Contract: Operaciones LLM (prompts + I/O schemas)
- T019: Tests rojos integración US1 (FR-002/003/024)
- Security Policy
- FR-025: Log diagnóstico local rotativo + copiar reporte sin secretos
- api/documents.ts
- Questions & Discussions Forum (GitHub Discussions)
- REST routes: /api/settings (GET nunca devuelve key; PUT → credentials.json; test-connection)
- D1: Hono ^4 + @hono/node-server ^2
- FR-011: Catálogo de assessments recomendados
- FR-014: Parseo de postulación a estructura editable
- FR-020: Configuración propia de proveedor IA (presets + custom OpenAI-compatible)
- 0002_settings.sql
- Feature Request Issue Template
- D7: TanStack Query ^5 para data fetching client
- FR-001: Instalación y ejecución 100% local
- FR-004: Subida de documentos propios a biblioteca local
- FR-005: Extracción estructurada vía servicio de IA configurado
- FR-007: Biblioteca como tabla (documento/descripción/datos/metadata)
- FR-008: Panel de detalle deslizante editable inline
- FR-012: Resultados de assessments enriquecen soft skills
- FR-013: Ingreso de postulación por texto o imagen
- FR-015: CV adaptado al puesto sin inventar experiencia
- FR-016: Vista previa fiel antes de exportar
- FR-018: Evaluación con chequeos deterministas + rúbrica semántica IA
- FR-019: Snapshots versionados reproducibles con borrado manual
- FR-021: Datos solo locales, cero telemetría
- FR-022: UI en español e inglés
- SC-003: 100% PDFs exportados pasan chequeos mecánicos
- T002: tsconfig strict + .gitignore (.opencode/, data/, dist/)
- T003: ESLint flat + Prettier, scripts lint/typecheck
- T006: CI GitHub Actions setup-node@v4 (Node 22), lint+typecheck+test
- T007: README.md requisitos y AGENTS.md comandos
- T008: Framework migraciones migrate.ts (tx + PRAGMA user_version)
- T010: Repositorios base repo.ts + conexión singleton WAL
- T011: Middleware errores Hono (shape error estándar)
- T012: Logger rotativo local (jamás loguear api_key)
- T013: Settings store (credentials.json gitignored, GET nunca devuelve key)
- T015: Schemas zod compartidos src/shared/schemas/
- T016: Shell SPA (router, QueryClientProvider, nav, language switcher)
- T018: Cliente API tipado + query hooks base
- T020: Routes /api/profiles* y /api/profile/:coll*
- T021: Unicidad skill + exactly-one-active tx activate
- T022: Página Perfil (forms zod, CEFR select, badges categoría)
- T023: Onboarding (primer perfil + idioma UI vía settings PUT)
- T024: Selector perfil activo + E2E smoke onboarding→perfil
- T028: Routes /api/documents POST multipart (25MB→413, extracción async queued|running|done|error)
- T030: Import engine (preview diff create/update/conflicto + import tx registra imported_entity)
- T031: Componente DocumentTable (grilla estilo Notion, estados pending/reviewed/error)
- T032: SlideOverPanel editable-inline + DiffReview modal para aprobar cambios
- T035: E2E us2.spec.ts (upload diploma fixture mock → corregir → importar)
- T040: Template ATS-safe ats-classic-v1.html.hbs + print CSS + renderer pdf/render.ts
- T043: Páginas Studio (generar→preview iframe→export) + Historial (snapshots, re-export, delete manual)
- T044: E2E us3.spec.ts (pegar posting → generar → export → validar PDF/JSON)
- T045: Tests rojos motor ATS tests/unit/ats-engine.test.ts (funciones puras ats/engine.ts)
- T047: ScoreReport component (total, breakdown, tabla requisitos con evidencia y sugerencias)
- T048: Flujo iteración (sugerencia → snapshot hijo parent_cv_id, comparador scores padre/hijo)
- T049: E2E us4.spec.ts mock (evaluar → aplicar top suggestion → score mejora)
- Import JSON Resume → documento virtual → flujo human-in-the-loop
- schema.ts
- skill.ts
- profile.ts
- extractDocument — extracción asistida de documentos
- assessment.ts
- schemas/index.ts
- Studio.tsx
- document.ts
- parsePosting — parseo de postulación de trabajo
- tailorCv — adaptación del CV a una postulación
- app.ts
- routes/postings.ts
- collections.ts
- extraction.ts
- routes/cvs.ts
- resumeio/import.ts
- scripts
- TweakCV — Ficha de proyecto
- package.json
- evaluateCv — evaluación semántica del CV contra una postulación
- ISS-001-setup-foundation.md
- ISS-002-us1-perfil.md
- ISS-003-us2-ingesta.md
- ISS-004-us3-generacion.md
- ISS-005-us4-evaluacion-ats.md
- ISS-006-diagnostics.md
- ISS-007-settings-page.md
- ISS-008-privacy-audit.md
- ISS-009-bench-perf.md
- ISS-010-quickstart-release.md
- allowScripts
- hono
- @hono/node-server
- openai
- puppeteer
- react-dom
- react-router
- tsx
- zod

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 39 edges
2. `makeCrud()` - 26 edges
3. `useT()` - 21 edges
4. `dataDir()` - 19 edges
5. `compilerOptions` - 18 edges
6. `createApp()` - 17 edges
7. `registerCvRoutes()` - 17 edges
8. `Quickstart: Validación end-to-end TweakCV MVP` - 17 edges
9. `requireActiveProfile()` - 16 edges
10. `ApiError` - 15 edges

## Surprising Connections (you probably didn't know these)
- `clientWith()` --calls--> `createApp()`  [EXTRACTED]
  tests/unit/errors.test.ts → src/server/app.ts
- `createCvWithPosting()` --calls--> `getDb()`  [EXTRACTED]
  tests/integration/us4-ats.test.ts → src/server/db/index.ts
- `Install Dependencies Step (npm ci)` --calls--> `Command: npm install`  [INFERRED]
  .github/workflows/ci.yml → README.md
- `Lint Step (npm run lint)` --calls--> `Command: npm run lint`  [EXTRACTED]
  .github/workflows/ci.yml → README.md
- `Test Step (npm test)` --calls--> `Command: npm test`  [EXTRACTED]
  .github/workflows/ci.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Gate Steps** — _github_workflows_ci_lint_step, _github_workflows_ci_typecheck_step, _github_workflows_ci_test_step [EXTRACTED 1.00]
- **Pipeline generación y evaluación de CV (posting → tailorCv → snapshot inmutable → evaluate mecánica+semántica → SC-005)** — specs_001_tweakcv_mvp_data_model_job_posting, specs_001_tweakcv_mvp_contracts_ai_prompts_tailor_cv, specs_001_tweakcv_mvp_data_model_generated_cv, specs_001_tweakcv_mvp_contracts_ai_prompts_evaluate_cv, specs_001_tweakcv_mvp_contracts_ai_prompts_ats_mechanical_engine, specs_001_tweakcv_mvp_spec_sc_005 [EXTRACTED 1.00]
- **Flujo de escritura human-in-the-loop (propuesta → diff preview → approve → imported_entity)** — specs_001_tweakcv_mvp_spec_fr_006, specs_001_tweakcv_mvp_spec_human_in_the_loop, specs_001_tweakcv_mvp_contracts_api_documents_routes, specs_001_tweakcv_mvp_contracts_json_resume_mapping_import_flow, specs_001_tweakcv_mvp_data_model_imported_entity [EXTRACTED 1.00]
- **Pipeline de operaciones LLM (extractDocument → parsePosting → tailorCv → evaluateCv)** — specs_001_tweakcv_mvp_contracts_ai_prompts_extract_document, specs_001_tweakcv_mvp_contracts_ai_prompts_parse_posting, specs_001_tweakcv_mvp_contracts_ai_prompts_tailor_cv, specs_001_tweakcv_mvp_contracts_ai_prompts_evaluate_cv [EXTRACTED 1.00]
- **Specify Plan Tasks Implement Cycle** — _specify_workflows_speckit_workflow_specify_step, _specify_workflows_speckit_workflow_plan_step, _specify_workflows_speckit_workflow_tasks_step, _specify_workflows_speckit_workflow_implement_step [EXTRACTED 1.00]
- **Spec Kit Artifact Templates** — _specify_templates_spec_template_feature_spec_template, _specify_templates_plan_template_implementation_plan_template, _specify_templates_tasks_template_task_list_template, _specify_templates_checklist_template_requirements_checklist_template [INFERRED 0.85]

## Communities (130 total, 62 thin omitted)

### Community 0 - "ai/client.ts"
Cohesion: 0.08
Nodes (25): AiClient, AiClientOptions, AiConfig, AiError, AiErrorCode, CompleteJsonInput, PRESET_BASE_URLS, resolveConfig() (+17 more)

### Community 1 - "AGENTS.md Agent Instructions"
Cohesion: 0.06
Nodes (53): AGENTS.md Agent Instructions, src/server/ai/client.ts, SQLite via better-sqlite3, mock AI Provider for Deterministic Tests, PDF Export via Puppeteer, src/client React SPA, src/server Hono API, src/shared zod schemas (+45 more)

### Community 2 - "useT"
Cohesion: 0.06
Nodes (51): api, ApiClientError, ApiErrorShape, Health, ProfileFull, SkillRow, useActivateProfile(), useActiveProfile() (+43 more)

### Community 3 - "education.ts"
Cohesion: 0.29
Nodes (6): Education, EducationCreate, educationCreateSchema, educationInputSchema, educationSchema, educationStatusSchema

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): concurrently, eslint, @eslint/js, devDependencies, concurrently, eslint, @eslint/js, @playwright/test (+21 more)

### Community 5 - "dependencies"
Cohesion: 0.15
Nodes (13): ajv, better-sqlite3, handlebars, @jsonresume/schema, dependencies, ajv, better-sqlite3, handlebars (+5 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (25): DOM, DOM.Iterable, ES2022, node, src, tests, compilerOptions, allowImportingTsExtensions (+17 more)

### Community 7 - "Entidad profile (perfiles, exactamente uno activo)"
Cohesion: 0.25
Nodes (15): REST routes: /api/profile/:coll CRUD uniforme (experiences|education|skills|projects|assessments), REST routes: /api/profiles* (CRUD + activate + active), Export interno → JSON Resume (tabla de mapeo; assessment NO se exporta), Entidad assessment (kolbe/cliftonstrengths/16personalities/disc/mbti/other), Entidad document (pending→reviewed→imported; extracted_json), Entidad education (credential_ref → documents), Entidad experience, Entidad imported_entity (trazabilidad FR-010, merge/duplicados) (+7 more)

### Community 8 - "pdf/export.ts"
Cohesion: 0.09
Nodes (39): SnapshotSkill, TailorCvOutput, tailorCvOutputSchema, AtsCheck, AtsResult, checkContactDensity(), checkKeywordCoverage(), checkLength() (+31 more)

### Community 9 - "log.ts"
Cohesion: 0.15
Nodes (15): createLogger(), emit(), LEVELS, logFilePath(), Logger, LogLevel, LogLine, maxBytes() (+7 more)

### Community 10 - "Speckit Full SDD Cycle Workflow"
Cohesion: 0.16
Nodes (18): /speckit.checklist Command, Spec Kit: Checklist Template, Constitution Check Gate, Spec Kit: Implementation Plan Template, Spec Kit: Feature Specification Template, Spec Kit: Task List Template, speckit.implement Command, speckit.plan Command (+10 more)

### Community 11 - "common.ps1"
Cohesion: 0.23
Nodes (13): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+5 more)

### Community 12 - "Contract: Mapping interno ↔ JSON Resume"
Cohesion: 0.33
Nodes (6): Contract: Mapping interno ↔ JSON Resume, Extensión x-tweakcv (round-trip sin pérdida de tags/campos extra), Research: TweakCV MVP (D1-D10), D3: Puppeteer ^25 con Chrome for Testing auto-descargado, D9: Bundle @jsonresume/schema@1.2.1 + ajv, T041: Motor PDF pdf/export.ts (puppeteer, timeout <10s) + exports md/json vía resumeio/export.ts + x-tweakcv

### Community 13 - "Quickstart: Validación end-to-end TweakCV MVP"
Cohesion: 0.12
Nodes (19): Contract: REST API (cliente ↔ servidor), Implementation Plan: TweakCV MVP, Quickstart: Validación end-to-end TweakCV MVP, D10: Vitest ^4 + Playwright 1.62, D8: Vite ^8 + plugin-react ^6, proxy /api, SC-001: Instalación a primer CV adaptado <30 min, SC-002: Ingesta diploma típica <2 min, SC-004: Reporte clasifica 100% requisitos duros con evidencia (+11 more)

### Community 15 - "Entidad generated_cv (snapshot inmutable, parent_cv_id, score_json)"
Cohesion: 0.15
Nodes (15): Motor ATS determinista (src/server/ats/, sin IA, testeable unitario), AI op: evaluateCv (rúbrica semántica, topSuggestions ≤5), AI op: parsePosting (title/company/hardRequirements/niceToHave/keywords), AI op: tailorCv (secciones reordenadas, omittedRefs auditable), REST routes: /api/cvs (generate, evaluate, export pdf/md/json, historial), REST routes: /api/postings (parse IA → parsed_json corregible), Entidad generated_cv (snapshot inmutable, parent_cv_id, score_json), Entidad job_posting (raw + parsed_json editable) (+7 more)

### Community 16 - "Data Model: TweakCV MVP"
Cohesion: 0.18
Nodes (11): Specification Quality Checklist: TweakCV MVP, Data Model: TweakCV MVP, D2: better-sqlite3 ^13, SQL directo, migraciones numeradas (PRAGMA user_version), D5: zod ^4 único lenguaje de schemas, D6: i18n módulo propio minimalista ES/EN, Spec: TweakCV MVP — Personal CV Database & ATS-Tailored CV Studio, Clarifications Session 2026-08-22 (multi-perfil, JSON Resume, retención, performance, diagnóstico), T009: Migración 0001_core.sql (tablas core según data-model.md) (+3 more)

### Community 18 - "getDb"
Cohesion: 0.17
Nodes (21): dataDir(), getDb(), applyImport(), buildImportPreview(), Coll, COLL_ENUM, currentMonth(), DiffField (+13 more)

### Community 19 - "profile"
Cohesion: 0.28
Nodes (10): education, experience, profile, project, skill, assessment, document, imported_entity (+2 more)

### Community 20 - "Contract: Operaciones LLM (prompts + I/O schemas)"
Cohesion: 0.40
Nodes (5): Contract: Operaciones LLM (prompts + I/O schemas), Salidas estructuradas: json_schema strict + re-validación zod server-side + retry ×1, D4: openai SDK ^7 con baseURL configurable, FR-023: Errores accionables ante fallos IA con reintento automático, T014: Cliente LLM ai/client.ts (openai SDK, preset mock, pre-check vision, retry, validación zod)

### Community 21 - "T019: Tests rojos integración US1 (FR-002/003/024)"
Cohesion: 0.50
Nodes (4): FR-002: CRUD de cada sección del perfil, FR-003: Skills categorizadas con nivel de idioma, FR-024: Múltiples perfiles con uno activo, T019: Tests rojos integración US1 (FR-002/003/024)

### Community 22 - "Security Policy"
Cohesion: 0.67
Nodes (3): Bug Report Issue Template, GitHub Security Advisories Reporting Channel, Security Policy

### Community 23 - "FR-025: Log diagnóstico local rotativo + copiar reporte sin secretos"
Cohesion: 0.67
Nodes (3): REST routes: /api/system logs tail + diagnostics (sin secretos), FR-025: Log diagnóstico local rotativo + copiar reporte sin secretos, T050: Diagnósticos GET /api/system/logs/tail + diagnostics + botón copiar reporte (FR-025)

### Community 24 - "api/documents.ts"
Cohesion: 0.18
Nodes (18): DocRow, ImportOp, useDeleteDocument(), useDocuments(), useImportDocument(), useImportPreview(), useImportResumeJson(), useInvalidateDocs() (+10 more)

### Community 84 - "Import JSON Resume → documento virtual → flujo human-in-the-loop"
Cohesion: 0.22
Nodes (9): AI op: extractDocument (ExtractedDocument union por kind), REST routes: /api/documents* (upload multipart 25MB, reextract, import preview/approve), Import JSON Resume → documento virtual → flujo human-in-the-loop, FR-006: Escritura IA como propuesta revisable (human-in-the-loop), FR-017: Export PDF/md/JSON Resume + import JSON Resume, Human-in-the-loop (aprobación explícita de escrituras IA), T026: Tests rojos integración US2 (mock extract, FR-006 nada escribe sin approve), T027: Op AI extractDocument (ramas por kind según contrato) (+1 more)

### Community 85 - "schema.ts"
Cohesion: 0.15
Nodes (12): assessmentResultExtracted, confidence, contactExtracted, credentialExtracted, cvEducationExtracted, cvExperienceExtracted, cvExtracted, cvProjectExtracted (+4 more)

### Community 88 - "skill.ts"
Cohesion: 0.22
Nodes (8): cefrSchema, Skill, skillCategorySchema, SkillCreate, skillCreateSchema, skillInputObjectSchema, skillInputSchema, skillSchema

### Community 89 - "profile.ts"
Cohesion: 0.19
Nodes (10): Contact, contactSchema, ProfileCreate, profileCreateSchema, profileSchema, Project, ProjectCreate, projectCreateSchema (+2 more)

### Community 90 - "extractDocument — extracción asistida de documentos"
Cohesion: 0.29
Nodes (6): Errores (contrato ai-prompts.md), extractDocument — extracción asistida de documentos, Input, Instrucciones por kind, Objetivo, Reglas inquebrantables

### Community 91 - "assessment.ts"
Cohesion: 0.33
Nodes (5): Assessment, AssessmentInput, assessmentInputSchema, assessmentSchema, assessmentTypeSchema

### Community 92 - "schemas/index.ts"
Cohesion: 0.28
Nodes (6): yearMonthSchema, Experience, ExperienceCreate, experienceCreateSchema, experienceInputSchema, experienceSchema

### Community 93 - "Studio.tsx"
Cohesion: 0.12
Nodes (26): AtsCheck, CvFull, CvScore, CvSummary, RubricItem, useCvPreview(), useCvs(), useDeleteCv() (+18 more)

### Community 95 - "document.ts"
Cohesion: 0.22
Nodes (8): documentBase, documentKindSchema, documentPatchSchema, DocumentRow, documentStatusSchema, documentUploadMetaSchema, extractionMetaSchema, extractionStateSchema

### Community 96 - "parsePosting — parseo de postulación de trabajo"
Cohesion: 0.33
Nodes (5): Errores (contrato ai-prompts.md), Input, Output, parsePosting — parseo de postulación de trabajo, Reglas inquebrantables

### Community 97 - "tailorCv — adaptación del CV a una postulación"
Cohesion: 0.33
Nodes (5): Errores (contrato ai-prompts.md), Input, Output, Reglas inquebrantables, tailorCv — adaptación del CV a una postulación

### Community 99 - "app.ts"
Cohesion: 0.15
Nodes (9): main(), timed(), main(), createApp(), closeDb(), app, VALID_RESUME, createCvWithPosting() (+1 more)

### Community 100 - "routes/postings.ts"
Cohesion: 0.20
Nodes (14): createAiClient(), MOCK_PARSE, ParsePostingOutput, parsePostingOutputSchema, owned(), readUploadBase64(), registerPostingRoutes(), repo() (+6 more)

### Community 101 - "collections.ts"
Cohesion: 0.21
Nodes (16): COLL_TABLE, COLLECTIONS, CollRow, JSON_COLS, registerCollectionRoutes(), registerProfileRoutes(), repo(), toApi() (+8 more)

### Community 102 - "extraction.ts"
Cohesion: 0.19
Nodes (12): mockExtractFor(), Column, WithId, docs(), documentFilePath(), DocumentRow, KIND_INSTRUCTIONS, runExtraction() (+4 more)

### Community 103 - "routes/cvs.ts"
Cohesion: 0.27
Nodes (13): EvalInput, mockEvaluate(), SemanticEvaluation, semanticEvaluationSchema, mockTailorFromSnapshot(), makeCrud(), activeSnapshot(), jsonExpand() (+5 more)

### Community 104 - "resumeio/import.ts"
Cohesion: 0.21
Nodes (9): ApiError, DocumentRow, mapResumeToCv(), Rec, require, toMonth(), validateExportedResume(), validator() (+1 more)

### Community 105 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, bench, build, dev, lint, start, test, test:e2e (+1 more)

### Community 106 - "TweakCV — Ficha de proyecto"
Cohesion: 0.25
Nodes (7): ADRs, Alcance, Evidencia transversal (al cierre de cada corrida), Milestones, Orden de ataque, Ruta crítica, TweakCV — Ficha de proyecto

### Community 107 - "package.json"
Cohesion: 0.25
Nodes (7): description, engines, node, license, name, type, version

### Community 108 - "evaluateCv — evaluación semántica del CV contra una postulación"
Cohesion: 0.40
Nodes (4): evaluateCv — evaluación semántica del CV contra una postulación, Input, Output, Reglas

### Community 109 - "ISS-001-setup-foundation.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 110 - "ISS-002-us1-perfil.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 111 - "ISS-003-us2-ingesta.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 112 - "ISS-004-us3-generacion.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 113 - "ISS-005-us4-evaluacion-ats.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 114 - "ISS-006-diagnostics.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 115 - "ISS-007-settings-page.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 116 - "ISS-008-privacy-audit.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 117 - "ISS-009-bench-perf.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 118 - "ISS-010-quickstart-release.md"
Cohesion: 0.50
Nodes (3): Acceptance Criteria, Contexto, Evidencia de cierre

### Community 119 - "allowScripts"
Cohesion: 0.50
Nodes (4): allowScripts, better-sqlite3@13.0.3, esbuild@0.28.2, puppeteer@25.8.0

## Knowledge Gaps
- **333 isolated node(s):** `name`, `version`, `description`, `type`, `license` (+328 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api` connect `useT` to `api/documents.ts`, `Studio.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `ai/client.ts`, `app.ts`, `routes/postings.ts`, `collections.ts`, `extraction.ts`, `routes/cvs.ts`, `pdf/export.ts`, `resumeio/import.ts`, `log.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `ApiError` connect `resumeio/import.ts` to `ai/client.ts`, `app.ts`, `routes/postings.ts`, `collections.ts`, `routes/cvs.ts`, `pdf/export.ts`, `getDb`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _333 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai/client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08246225319396051 - nodes in this community are weakly interconnected._
- **Should `AGENTS.md Agent Instructions` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._
- **Should `useT` be split into smaller, more focused modules?**
  _Cohesion score 0.05649122807017544 - nodes in this community are weakly interconnected._