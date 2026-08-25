---
id: ISS-003
title: US2 — Ingesta de documentos IA (T025–T035)
status: done
priority: 3
labels: [Feature]
parent: M3
estimate: 5
created: 2026-08-24
done: 2026-08-24
---

## Contexto

Subir documento → extraer IA → revisar en grilla+slide-over → importar por diff aprobado (FR-006 nada escribe sin approve). FR-010 trazabilidad orphaned. FR-017 JSON Resume.

## Acceptance Criteria

- [x] Migración documents/imported_entity/assessment (real: `0003_documents.sql`; document_id nullable SET NULL) + schemas zod
- [x] Op extractDocument con unión discriminada por kind y fixtures mock deterministas
- [x] POST multipart 25MB→413, guardado data/uploads, extracción async queued→running→done|error con polling
- [x] PATCH→reviewed · reextract→pending con historial en meta · DELETE marca orphaned sin borrar entidades
- [x] Import engine: preview diff create/update por campo; apply tx registra imported_entity; re-import propone merge
- [x] DocumentTable grilla estilo Notion + SlideOverPanel editable-inline + DiffReview modal
- [x] Catálogo assessments recomendados con links oficiales (FR-011)
- [x] Import resume.json vía ajv contra schema bundled → documento virtual cv → mismo flujo HITL
- [x] E2E subir diploma→importar→visible en Perfil

## Evidencia de cierre

- `tests/integration/us2-documents.test.ts` 13 verdes + `us2-resume.test.ts` 3 verdes
- `tests/e2e/us2.spec.ts` verde; suite 87/87 al cierre; lint/typecheck/build OK
