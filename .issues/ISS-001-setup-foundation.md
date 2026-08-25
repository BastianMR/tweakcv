---
id: ISS-001
title: Setup + Foundational (T001–T018)
status: done
priority: 3
labels: [setup, Feature]
parent: M1
estimate: 5
created: 2026-08-23
done: 2026-08-24
---

## Contexto

Base técnica completa del MVP según `specs/001-tweakcv-mvp/tasks.md` Phase 1+2: tooling, persistencia, infra de server y shell cliente. Spec canónica en `.specify/` y `specs/`.

## Acceptance Criteria

- [x] package.json/tsconfig/eslint/prettier/vite operativos con scripts dev/build/test/lint/typecheck
- [x] Framework migraciones numeradas (`PRAGMA user_version`, tx por migración) + test unitario
- [x] Migración core (profile/experience/education/skill/project) con FKs/CHECKs/unicidad (skill case-insensitive; exactamente-un-activo)
- [x] Conexión singleton better-sqlite3 WAL + CRUD tipado genérico (`makeCrud`)
- [x] Middleware errores `{error:{code,message,detail?}}` sin stack al cliente
- [x] Logger rotativo `data/logs/app.log` que redacta api_key
- [x] Settings store: tabla setting + credentials.json gitignored; GET jamás devuelve key
- [x] Cliente LLM openai SDK con presets, preset `mock` determinista, retry ×1, pre-check visión, códigos ai_schema/no_vision/ai_unreachable
- [x] Schemas zod compartidos espejando tablas
- [x] Shell SPA: router + react-query + nav 6 secciones + i18n ES/EN tipado (`useT`) + cliente API tipado

## Evidencia de cierre

- `npm test`: 56 tests verdes al cerrar la fase (migrate/db/errors/log/settings/ai-client/schemas)
- `npm run lint` y `npm run typecheck` limpios; build de producción OK
- Desviación documentada: settings usa migración `0002_settings.sql` (tasks.md reservaba 0002 para documents)
