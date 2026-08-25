---
id: ISS-010
title: Quickstart manual + CHANGELOG + README final (T054)
status: done
priority: 3
labels: [docs]
parent: M6
estimate: 2
created: 2026-08-24
done: 2026-08-24
---

## Contexto

Cierre MVP: validar los 10 escenarios de `specs/001-tweakcv-mvp/quickstart.md`. El propio quickstart acepta "manualmente **o vía E2E equivalente**".

## Acceptance Criteria

- [x] Escenarios quickstart 1–10 validados — mapeo a evidencia automatizada:

| # | Escenario | Evidencia |
|---|-----------|-----------|
| 1 | Onboarding + perfil persiste | E2E us1 + integration us1 (CRUD <1s por bench) |
| 2 | Ingesta diploma → diff → Education | E2E us2 (slide-over, corrección inline, trazabilidad) |
| 3 | resume.json válido/inválido | us2-resume.test.ts (400 sin side-effects) |
| 4 | Assessment extraído + catálogo | us2-documents assessment test; catálogo UI con links. Nota: sugerencia de soft-skill derivada al importar queda para post-MVP |
| 5 | Posting→generar→export 3 formatos | E2E us3 (%PDF magic, md legible, JSON Resume validator) |
| 6 | Evaluar→iterar hijo + re-export idéntico | us4 tests SC-005/SC-004 + E2E us4 |
| 7 | Multi-perfil aislado | us1/us3/us4 tests de scope y activate |
| 8 | Privacidad host inexistente + diagnóstico sin key | scripts/privacy-audit.ts + settings-api unreachable |
| 9 | i18n ES↔EN | diccionarios tipados completos; switcher en layout (verificación visual en screenshots) |
| 10 | Performance <1s / <10s | npm run bench → SC-008 OK |

- [x] CHANGELOG `[Unreleased]` completo (Added/Changed reales)
- [x] README final con screenshots reales (`docs/screenshots/*.png`) generados vía Playwright
- [x] Suite completa verde al cierre

## Evidencia de cierre

- `npm test` 126/126 · lint/typecheck/build ✅ · `npm run bench` SC-008 OK · privacy-audit OK
- E2E us1–us4 juntos sobre data/e2e limpia: **4 passed (21.6s)**
