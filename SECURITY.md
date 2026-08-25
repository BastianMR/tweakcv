# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Reporting a Vulnerability

Report vulnerabilities privately via
[GitHub Security Advisories](../../security/advisories/new).

Include reproduction steps and affected versions. Expect an initial
response within 7 days. Please do not open public issues for security reports.

## Privacidad y manejo de secretos (SC-006)

TweakCV es 100% local: **cero telemetría, cero conexiones de red salvo el
endpoint del proveedor de IA que el usuario configura explícitamente**.

- La `api_key` vive únicamente en `data/credentials.json` (gitignored). Nunca se
  guarda en la base SQLite ni viaja al cliente.
- El logger (`data/logs/app.log`) redacta cualquier campo/valor con forma de
  `api_key` antes de escribir, y `GET /system/logs/tail` re-redacta al leer.
- `GET /api/system/diagnostics` arma el reporte pasando por la misma redacción.
- Auditoría automatizada: `node --import tsx scripts/privacy-audit.ts`
  (paso obligatorio en CI) — simula uso con una key sonda y verifica su ausencia
  en logs, tail, diagnostics y dump binario de la DB. Falla el build si hay leak.
