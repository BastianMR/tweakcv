---
id: ISS-006
title: Diagnósticos — logs tail + system diagnostics (T050)
status: done
priority: 3
labels: [Feature]
parent: M6
estimate: 2
created: 2026-08-24
done: 2026-08-24
---

## Contexto

FR-025: soporte sin telemetría. Endpoints de diagnóstico locales + botón "Copiar reporte" en Ajustes.

## Acceptance Criteria

- [x] `GET /api/system/logs/tail?n=50` devuelve últimas N líneas del log rotativo (sin api_key — redacción activa)
- [x] `GET /api/system/diagnostics` arma reporte: versión app, OS/node, settings SIN key, últimos errores del log
- [x] Página Ajustes: botón "Copiar reporte" que pega el diagnóstico al portapapeles
- [x] Tests de integración cubren ambos endpoints (incluye assert de no-filtración de key)

## Evidencia de cierre

- `tests/integration/sys-diagnostics.test.ts` 2 verdes (tail redacta `api_key=sk-…`; diagnostics sin la key seteada)
- Suite completa 126/126 · lint · typecheck OK
