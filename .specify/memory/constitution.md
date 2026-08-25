# Project Constitution


## Artículos base (heredados del workflow global)

### Article I — Principios de código
1. La solución más simple que funciona gana (YAGNI). Antes de agregar una dependencia: ¿existe ya en el repo? ¿lo cubre la stdlib/plataforma?
2. CERO comentarios salvo pedido explícito del usuario. El código se explica solo.
3. Mimic el estilo del codebase existente: convenciones, librerías, patrones vecinos antes que gusto propio.
4. Seguridad primero: nunca loguear secretos, nunca commitear credenciales, validar input externo.

### Article II — Calidad y verificación
1. TDD cuando exista feature/bugfix con test framework definido: test rojo → mínimo verde → refactor.
2. Evidencia antes de afirmaciones: ningún "listo" sin comando de verificación ejecutado y su output confirmado.
3. Lint/typecheck del stack corren antes de dar un cambio por terminado.
4. Bugs: diagnosticar causa raíz ANTES de editar; el fix va en la capa más angosta responsable.

### Article III — Flujo SDD híbrido
1. Toda feature nueva pasa por el router `sdd-hybrid`: ruta superpowers (chicos) o Spec Kit (medianos/grandes).
2. En ruta SDD la fuente de verdad es la spec: los cambios de comportamiento empiezan editando spec.md, nunca parcheando código directo.
3. Cada fase produce artefacto versionable; ninguna fase salta gates de revisión humana.
4. `verification-before-completion` es obligatorio antes de declarar `/speckit.converge` converged.

### Article IV — Proceso
1. Nunca commitear sin pedido explícito del usuario.
2. Plan mode = read-only: clarifying questions antes de asumir stack o features.
3. Delegar exploración/investigación a subagents para proteger contexto principal.

## Artículos [PROYECTO] — completar al instanciar

### Article V — Stack y arquitectura
- Lenguaje/runtime: TypeScript 5 sobre Node.js >= 22 LTS
- Framework(s) principales: Vite + React (SPA), Hono (HTTP), better-sqlite3 (DB local), Puppeteer (HTML a PDF)
- Gestor de paquetes: npm
- Decisiones arquitectónicas registradas en: .specify/specs/ (spec.md y plan.md por feature)

### Article VI — Testing y CI
- Test runner: Vitest (unit/integration) + Playwright (E2E)
- Comando de tests: npm test
- Comando lint/typecheck: npm run lint && npm run typecheck
- Cobertura mínima: sin umbral inicial; subir incrementalmente (default sugerido: la que ya tenga el repo)

### Article VII — Convenciones del proyecto
- Estilo de commits: Conventional Commits (default: Conventional Commits)
- Estructura de carpetas relevante: src/client (SPA Vite+React, i18n ES/EN), src/server (Hono: routes/, ai/, pdf/, db/), data/ (tweakcv.db + uploads/, gitignored), .specify/
- Restricciones específicas: App 100% local: los datos del usuario nunca salen de la maquina salvo las llamadas IA que el mismo configura. Cero telemetria. API keys unicamente en archivos gitignored. Human-in-the-loop obligatorio: la IA nunca escribe directo a la DB, siempre propone diff para aprobacion.

---
*Ratificado: 2026-08-22 · Última enmienda: 2026-08-22 · Versión: 1.0.1 (Node floor 22 LTS por ABI de dependencias)*
