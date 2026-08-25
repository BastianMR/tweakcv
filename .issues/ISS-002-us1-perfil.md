---
id: ISS-002
title: US1 — Base de datos personal (T019–T024)
status: done
priority: 3
labels: [Feature]
parent: M2
estimate: 5
created: 2026-08-23
done: 2026-08-24
---

## Contexto

CRUD multi-perfil con exactamente-un-activo y colecciones scopeadas al perfil activo. FR-002/003/024.

## Acceptance Criteria

- [x] Routes `/profiles` (list/create/patch/delete/activate/active) + `/profile/:coll` CRUD uniforme con validación zod
- [x] DELETE último perfil rechazado (409 cannot_delete_last_profile); activate conmuta en tx
- [x] Skills con categorías + CEFR obligatorio para idiomas + unicidad case-insensitive → 409 duplicate_skill
- [x] Página Perfil editable (skills con badges por categoría, experiencias, educación) + Onboarding primer uso
- [x] ProfileSwitcher en layout + endpoint activate
- [x] E2E smoke onboarding→perfil→persistencia tras reload

## Evidencia de cierre

- `tests/integration/us1-profile.test.ts`: 15 casos verdes
- `tests/e2e/us1.spec.ts` verde (Playwright)
- Suite completa 71/71 al cierre; lint/typecheck limpios
