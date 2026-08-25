---
id: ISS-007
title: Página Ajustes completa (T051)
status: done
priority: 3
labels: [Feature]
parent: M6
estimate: 2
created: 2026-08-24
done: 2026-08-24
---

## Contexto

Settings UI sobre el store existente (T013): presets de proveedor, test de conexión, warning de visión. FR-020.

## Acceptance Criteria

- [x] GET/PUT `/api/settings` wired a la UI: provider preset (openai/groq/openrouter/ollama/lmstudio/custom/mock), base_url, model, ui_language, log_level
- [x] PUT acepta api_key opcional → se escribe SOLO a credentials.json; respuestas jamás la incluyen (test verifica que tampoco quede en el .db)
- [x] `POST /api/settings/test-connection` → {ok, vision_capable} (models.list ping timeout 4s; mock siempre ok)
- [x] Warning visible si modelo sin visión (heurística por nombre + estado guardado)
- [x] Test integración test-connection (mock + host inaccesible → ok:false sin 500)

## Evidencia de cierre

- `tests/integration/settings-api.test.ts` 6 verdes
- Página `src/client/src/pages/Settings.tsx` con form completo + test connection + copiar reporte
- Suite 126/126 · lint/typecheck/build OK
