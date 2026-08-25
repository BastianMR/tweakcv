---
id: ISS-008
title: Auditoría privacidad CI (T052)
status: done
priority: 3
labels: [audit]
parent: M6
estimate: 1
created: 2026-08-24
done: 2026-08-24
---

## Contexto

SC-006 cero telemetría y FR privacidad: la api_key jamás debe aparecer en logs, dumps ni artefactos.

## Acceptance Criteria

- [x] CI step que falle si api_key aparece en logs/db dumps/diagnostics (`scripts/privacy-audit.ts` en `.github/workflows/ci.yml`)
- [x] Verificación de cero telemetría documentada en SECURITY.md (sección SC-006)
- [x] La sonda de auditoría cubre: diagnostics, logs/tail, app.log y dump binario de tweakcv.db

## Evidencia de cierre

- `node --import tsx scripts/privacy-audit.ts` → 4× "ok: sin api_key" + "Auditoría OK"
- CI step agregado después del job Test
