---
project: tweakcv
status: done
created: 2026-08-24
---

# TweakCV — Ficha de proyecto

App 100% local para armar tu base de datos personal de CV y generar CVs adaptados a cada postulación usando TU propia IA (OpenAI-compatible). Spec canónica: `specs/001-tweakcv-mvp/spec.md` · Plan: `plan.md` · Tasks originales: `tasks.md`.

## Alcance

**In (MVP)**
- CRUD multi-perfil con exactamente-un-activo; colecciones experiences/education/skills/projects/assessments
- Ingesta asistida por IA de documentos (diploma/cv/assessment/certificado/transcript/other) con extracción → revisión human-in-the-loop → import por diff aprobado
- Import/export JSON Resume válido (bloque `x-tweakcv`; assessments nunca viajan)
- Postulaciones texto/imagen → parseo IA editable
- Generación CV adaptado con snapshot inmutable (SC-005) + export PDF/md/JSON Resume vía template ATS único
- Evaluación ATS: motor mecánico determinista + rúbrica semántica IA, ponderación 60/40 configurable; iteración versionada padre/hijo
- i18n ES/EN · provider presets openai/groq/openrouter/ollama/lmstudio/custom/mock

**Out (MVP)**
- Multiusuario / cuentas / servidor remoto (FR-001: todo local)
- Websockets para progreso de extracción (polling — YAGNI)
- Múltiples templates de CV (solo `ats-classic-v1`)
- Export/import de assessments

## ADRs

| # | Decisión | Fecha | Estado |
|---|----------|-------|--------|
| 1 | Migraciones SQL numeradas con tracking `PRAGMA user_version`, una tx por migración, runner en `src/server/db/migrate.ts` | 2026-08-23 | accepted |
| 2 | `api_key` vive SOLO en `data/credentials.json` (gitignored); jamás en DB ni logs; logger redacta patrones api_key | 2026-08-23 | accepted |
| 3 | Preset `mock` determinista para tests/E2E sin red ni keys; ops AI definen `mockOutput` propio | 2026-08-23 | accepted |
| 4 | Schemas zod como única fuente de validación (server/client/AI); variantes Input (sin refinements) vs Create (refinados) porque zod v4 no permite omit/partial sobre refinements | 2026-08-23 | accepted |
| 5 | Reproducibilidad SC-005 por diseño: snapshot inmutable (`content_json`+`data_snapshot_json`) en INSERT; UPDATE prohibido salvo score_json y exports | 2026-08-23 | accepted |
| 6 | `imported_entity.document_id` nullable con `ON DELETE SET NULL`: el flag `orphaned` sobrevive al borrado del documento (FR-010) | 2026-08-23 | accepted |
| 7 | Import human-in-the-loop: preview diff create/update campo a campo → aplicar SOLO ops aprobados en tx, con whitelist de columnas anti-injection | 2026-08-23 | accepted |
| 8 | Export JSON Resume validado server-side con ajv (`strict:false` — format uri ignorado); bloque `x-tweakcv` preserva tags; assessments nunca se exportan | 2026-08-23 | accepted |
| 9 | Score ATS = 60% mecánica + 40% semántica, configurable vía `TWEAKCV_ATS_WEIGHT`; mecánica es motor puro sin IA (`src/server/ats/engine.ts`) | 2026-08-24 | accepted |
| 10 | Iteración = INSERT hijo con `parent_cv_id` heredando posting; el Studio auto-evalúa al hijo para comparación padre/hijo | 2026-08-24 | accepted |
| 11 | Gestión de trabajo con issues locales `.issues/*.md` (skill local-issues); reemplaza Linear por falta de conexión | 2026-08-24 | accepted |
| 12 | Commits solo bajo pedido explícito del usuario (constitution IV); repo quedó sin commits hasta ahora | 2026-08-24 | accepted |
| 13 | E2E en puertos dedicados (API 3101 / web 5199, proxy vía `VITE_API_PROXY`, `PORT` en index.ts) y `reuseExistingServer:false` — evita chocar con dev servers de otros proyectos (p.ej. Ensoulment en :5173) | 2026-08-24 | accepted |

> Desviaciones registradas vs tasks.md original: numeración de migraciones real = `0002_settings`, `0003_documents`, `0004_postings_cvs` (el doc original reservaba 0002 para documents).

## Milestones

| ID | Nombre | Issues | Estado |
|----|--------|--------|--------|
| M1 | Setup + Foundational | ISS-001 | done |
| M2 | US1 Base de datos personal | ISS-002 | done |
| M3 | US2 Ingesta documentos IA | ISS-003 | done |
| M4 | US3 Generación CV | ISS-004 | done |
| M5 | US4 Evaluación ATS e iteración | ISS-005 | done |
| M6 | Polish & release | ISS-006..ISS-010 | done |

## Orden de ataque

1. ~~M1 → M2 → M3 → M4 → M5~~ (completados; verificación integral 118 tests + 4 E2E ✅)
2. ~~M6 Polish~~ — **MVP COMPLETO (2026-08-24)**: 126 tests/17 archivos · lint/typecheck/build ✅ · bench SC-008 OK · privacy-audit OK · 4 E2E juntos ✅

## Ruta crítica

- MVP cerrado. Post-MVP sugerido: sugerencia de soft-skill derivada al importar assessments (quickstart #4), screenshots automáticos en CI, más templates de CV.

## Evidencia transversal (al cierre de cada corrida)

- Suite: `npm test` — **126 tests / 17 archivos ✅** (cierre M6)
- Gates: `npm run lint` · `npm run typecheck` · `npm run build` ✅
- E2E Playwright: us1/us2/us3/us4 juntos sobre data/e2e limpia ✅ (21.6s, puertos dedicados 3101/5199)
- Bench: `npm run bench` SC-008 OK (ops <1s, export 785ms) · Privacy: scripts/privacy-audit.ts OK
- Grafo de conocimiento: `graphify update .` tras cambios de código
