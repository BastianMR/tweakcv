---
id: ISS-009
title: Bench performance (T053)
status: done
priority: 4
labels: [quick-win]
parent: M6
estimate: 1
created: 2026-08-24
done: 2026-08-24
---

## Contexto

SC-008: ops locales <1s, export PDF <10s. Medir primero, optimizar solo si falla.

## Acceptance Criteria

- [x] Script `npm run bench` que mide: CRUD perfil/coll, generate (mock), export pdf+md+json, evaluate — imprime tabla ms/op
- [x] Umbrales SC-008 verificados en salida (falla con exit≠0 si excede)
- [x] Sin optimizaciones especulativas: solo medir

## Evidencia de cierre

Corrida final (`npm run bench`):
- POST /postings (parse mock): 5 ms · generate: 4 ms · evaluate: 4 ms (<1s ✓)
- export pdf+md+json con Puppeteer: 785 ms (<10s ✓)
- `SC-008 OK`
