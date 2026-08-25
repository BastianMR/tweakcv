# Quickstart: Validación end-to-end TweakCV MVP

Guía de validación manual del flujo feliz completo. Para implementación ver [tasks.md](./tasks.md); contratos en [contracts/](./contracts/api.md).

## Prerrequisitos

- Node.js ≥ 22 LTS (`node -v`)
- ~600MB disco (node_modules + Chrome for Testing de Puppeteer)
- Un endpoint IA OpenAI-compatible (OpenAI / Groq / OpenRouter / Ollama local / LM Studio). Para el flujo con imágenes: modelo con visión.
- Opcional para E2E sin IA real: mock server compatible (ver tests/e2e).

## Setup

```bash
npm install
npm run dev        # Hono :3001 + Vite :5173 (proxy /api)
```

Primera corrida: migraciones crean `data/tweakcv.db`; onboarding solicita idioma UI y proveedor IA.

## Escenarios de validación (map a SC)

1. **Onboarding + perfil** (SC-001, US1): crear perfil → agregar 2 experiencias, educación, skills técnicas + 1 idioma con CEFR → recargar → datos persisten. *Esperado: cada op local responde <1s.*
2. **Ingesta diploma** (SC-002, US2): subir PDF diploma → estado `pending`→extracción visible en grilla → abrir slide-over, corregir un campo inline → guardar → "Importar al perfil" → diff correcto → aprobar → fila aparece en Education con trazabilidad al documento. *Esperado: ciclo completo <2min.*
3. **Import JSON Resume** (FR-017): subir un `resume.json` válido del estándar → diff propuesto → aprobar → entidades creadas. Subir JSON inválido → error con path del fallo, sin side-effects.
4. **Assessment** (US2): cargar resultado 16Personalities como texto → extraído como assessment → catálogo marca tipo completado → skill blanda derivada sugerida al importar.
5. **Postulación + generación** (US3): pegar texto de posting real → estructura parseada editable → generar → preview fiel → exportar → verificar: PDF una columna texto seleccionable, `.md` legible, `.json` pasa validator JSON Resume; idioma CV = idioma posting.
6. **Evaluación** (US4, SC-004): evaluar CV → reporte lista cada requisito duro cubierto/parcial/faltante con evidencia → aplicar sugerencia top → regenerar (nuevo snapshot hijo) → score del aspecto trabajado mejora. Re-exportar snapshot original → byte-idéntico (SC-005).
7. **Multi-perfil** (Clarifications Q1): crear segundo perfil → activarlo → sus listas vacías → volver al primero → datos intactos.
8. **Privacidad** (SC-006): con proveedor apuntando a host inexistente, sesión completa → único tráfico red = intento a ese host; log local registra errores; "copiar reporte de diagnóstico" NO contiene api_key.
9. **i18n** (SC-007): switch ES↔EN → todas las pantallas principales traducidas.
10. **Performance** (SC-008): operaciones locales <1s percibidas; export PDF <10s.

## Comandos de verificación

```bash
npm test           # vitest unit+integration
npm run test:e2e   # playwright contra build servido por hono
npm run lint && npm run typecheck
npm run build && npm start   # prod single-process :3000
```

Criterio de done del feature: escenarios 1–10 verdes manualmente o vía E2E equivalente.
