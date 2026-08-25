# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Persistencia local: migraciones SQL numeradas (`PRAGMA user_version`, una tx por migración), tablas core (profile/experience/education/skill/project), settings, documents/imported_entity/assessment, job_posting/generated_cv.
- Capa de repositorios tipada sobre better-sqlite3 (WAL, FKs) con helpers CRUD genéricos.
- API REST (Hono) con shape de error estándar `{error:{code,message,detail?}}` y logger rotativo que redacta `api_key`.
- Settings store: presets de proveedor IA; `api_key` solo en `data/credentials.json` (gitignored); GET nunca la devuelve.
- Cliente LLM OpenAI-compatible con preset `mock` determinista (tests/E2E sin red ni keys), pre-check visión, retry ×1 y códigos `ai_schema`/`no_vision`/`ai_unreachable`.
- US1: CRUD multi-perfil con exactamente-un-activo, colecciones scopeadas al perfil activo, unicidad de skill case-insensitive, onboarding de primer uso y selector de perfil activo. i18n ES/EN.
- US2: ingesta de documentos asistida por IA — upload multipart (25MB→413), extracción async con estados, grilla estilo Notion, slide-over editable, import human-in-the-loop por diff aprobado, flag orphaned al borrar documentos, catálogo de assessments e import de `resume.json` validado con ajv.
- US3: postulaciones texto/imagen → parseo IA editable; generación de CV adaptado con snapshot inmutable (reproducible byte a byte); template ATS `ats-classic-v1`; export PDF (Puppeteer <10s) + Markdown + JSON Resume válido con bloque `x-tweakcv`.
- US4: evaluación ATS combinando motor mecánico determinista (keywords con evidencia, headings, una columna, contacto, longitud) + rúbrica semántica IA, ponderación 60/40 configurable (`TWEAKCV_ATS_WEIGHT`); iteración versionada padre/hijo con auto-evaluación.
- Issues locales en `.issues/` (index + ADRs + milestones) como reemplazo de Linear.

### Changed

- `specs/001-tweakcv-mvp/tasks.md`: checkboxes sincronizados con lo ejecutado; nota de numeración real de migraciones (`0002_settings`, `0003_documents`, `0004_postings_cvs`).
