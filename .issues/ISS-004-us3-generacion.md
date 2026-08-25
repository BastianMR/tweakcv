---
id: ISS-004
title: US3 — Generación CV desde postulación (T036–T044)
status: done
priority: 3
labels: [Feature]
parent: M4
estimate: 5
created: 2026-08-24
done: 2026-08-24
---

## Contexto

Posting texto/imagen → CV adaptado con snapshot inmutable → preview fiel → export PDF/md/JSON. SC-005 reproducibilidad. Núcleo de producto.

## Acceptance Criteria

- [x] Migración job_posting/generated_cv (+parent_cv_id) (real: `0004_postings_cvs.sql`) + schemas zod
- [x] Op parsePosting (texto|imagen con no_vision 422 pre-token) + routes /api/postings con PATCH corrección (FR-014)
- [x] Op tailorCv anti-invención con omittedRefs + mock que construye desde el snapshot
- [x] `/cvs/generate` INSERT inmutable con content_json+data_snapshot_json; **SC-005 test: dos generaciones byte-idénticas**
- [x] Template `ats-classic-v1.hbs` (una columna, headings canónicos, print CSS) + render.ts
- [x] Export pdf (puppeteer <10s) + md + JSON Resume válido server-side con x-tweakcv; assessments nunca viajan
- [x] Páginas Postulaciones (editor parsed_json), Studio (preview iframe + export), Historial (borrado manual)
- [x] E2E pegar posting→generar→exportar

## Evidencia de cierre

- `tests/integration/us3-generate.test.ts`: 13 verdes (incluye %PDF magic bytes y validación JSON Resume)
- `tests/e2e/us3.spec.ts` verde; suite 100/100 al cierre; build OK
