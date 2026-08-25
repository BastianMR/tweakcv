---
id: ISS-005
title: US4 — Evaluación ATS e iteración (T045–T049)
status: done
priority: 3
labels: [Feature]
parent: M5
estimate: 3
created: 2026-08-24
done: 2026-08-24
---

## Contexto

Score accionable mecánico+semántico e iteración versionada padre/hijo. SC-004 evidencia total, SC-005 regeneración idéntica.

## Acceptance Criteria

- [x] Motor ATS puro (`src/server/ats/engine.ts`): keywords presente/parcial/faltante CON evidencia, headings estándar, una columna (markup), densidad contacto, longitud — TDD unitario
- [x] Op evaluateCv semántica (rúbrica ≤8 criterios con evidence textual + topSuggestions ≤5) + route `/cvs/:id/evaluate` combinando 60/40 configurable → score_json (único UPDATE permitido)
- [x] ScoreReport component: total/mecánica/semántica + tabla checks con evidencia + sugerencias accionables
- [x] Iteración: generate con parent_cv_id heredando posting; Studio auto-evalúa al hijo; Historial muestra badge ATS + marcador iteración
- [x] E2E us4.spec.ts: generar→evaluar→regenerar desde sugerencia #1→hijo en historial con badge
- [x] **Verificación integral del MVP completa**

## Evidencia de cierre

- `tests/unit/ats-engine.test.ts` 12/12 · `tests/integration/us4-ats.test.ts` 6/6 · `tests/e2e/us4.spec.ts` ok
- Corrida integral final: **118 tests / 15 archivos ✅ · lint ✅ · typecheck ✅ · build ✅ · 4 E2E juntos sobre data/e2e limpia ✅ (22.7s)**
- Fix de infra detectado durante la verificación: puerto 5173 ocupado por dev server ajeno → E2E movidos a puertos dedicados (API 3101 / web 5199, `VITE_API_PROXY`, `PORT` en index.ts) con `reuseExistingServer:false`

