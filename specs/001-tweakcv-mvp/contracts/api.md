# Contract: REST API (cliente ↔ servidor)

Base: `/api` · JSON UTF-8 · errores `{error:{code,message,detail?}}` · códigos HTTP estándar.
Autenticación: ninguna (proceso local, single-user). Todos los recursos scopeados al perfil activo salvo `/profiles`.

## Profiles
| Método | Path | Descripción |
|---|---|---|
| GET | /profiles | listar perfiles |
| POST | /profiles | crear {name, contact_json?} |
| PATCH | /profiles/:id | renombrar/editar contacto/summary |
| DELETE | /profiles/:id | borrar (rechaza si es el único) |
| POST | /profiles/:id/activate | set activo (tx desactiva resto) |
| GET | /profiles/active | perfil activo + colecciones completas |

Colecciones del perfil (CRUD uniforme, `:coll` ∈ experiences|education|skills|projects|assessments):
- `GET/POST /profile/:coll` · `PATCH/DELETE /profile/:coll/:id`

## Documents
| Método | Path | Descripción |
|---|---|---|
| GET | /documents | grilla: id, name, kind, description, status, extracted_json, extraction_meta |
| POST | /documents | multipart upload → crea `pending`; dispara extracción async |
| GET | /documents/:id | detalle completo |
| PATCH | /documents/:id | editar description / extracted_json / kind (status→reviewed) |
| POST | /documents/:id/reextract | re-corrida IA (→pending) |
| POST | /documents/:id/import | body: diff aprobado {ops:[{action:create\|update,target,coll,id?,fields}]} → ejecuta tx, registra imported_entity, status→imported |
| POST | /documents/:id/import/preview | devuelve diff propuesto sin aplicar |
| DELETE | /documents/:id | borra doc+archivo; entidades importadas quedan (orphaned flag en imported_entity) |

Extracción progreso: `GET /documents/:id` incluye `extraction_meta.state: queued\|running\|done\|error` (polling client-side; sin websockets — YAGNI).

## Job postings
| Método | Path | Descripción |
|---|---|---|
| POST | /postings | {source:text\|image, raw_text? \| multipart image} → parse IA → parsed_json |
| PATCH | /postings/:id | corregir parsed_json (status→parsed confirmado) |
| GET/DELETE | /postings(/:id) | listar/detalle/borrar |

## CV generation & evaluation
| Método | Path | Descripción |
|---|---|---|
| POST | /cvs/generate | {posting_id?, language?} → genera snapshot (content_json + data_snapshot_json) → 201 con id |
| POST | /cvs/:id/evaluate | corre motor determinista + rúbrica IA → score_json |
| GET | /cvs | historial (id, posting, score.total, created_at, language) |
| GET | /cvs/:id | snapshot completo |
| POST | /cvs/:id/export | → {pdf,md,json} paths; PDF vía headless render |
| DELETE | /cvs/:id | borrado manual |

## Settings & system
| Método | Path | Descripción |
|---|---|---|
| GET/PUT | /settings | provider preset/base_url/model/ui_language (api_key NUNCA se devuelve; PUT la escribe a credentials.json) |
| POST | /settings/test-connection | ping models endpoint → {ok, vision_capable} |
| GET | /system/logs/tail?n=50 | últimas líneas de log local |
| GET | /system/diagnostics | texto armado para "copiar reporte" (versión, SO, errores recientes, settings SIN key) |

## Convenciones

- Uploads máx. 25MB por archivo (413 temprano).
- Mutaciones derivadas de IA siempre pasan por preview→approve (`import/preview` → `import`); ningún endpoint escribe directo de salida LLM.
- Idempotencia: regenerar desde mismo snapshot = nuevo INSERT (nunca muta el original).
