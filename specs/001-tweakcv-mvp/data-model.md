# Data Model: TweakCV MVP

**Date**: 2026-08-22 | SQLite local · migraciones numeradas · FK `profile_id` en todas las colecciones.

## Entidades

### profile
| Campo | Tipo | Reglas |
|---|---|---|
| id | TEXT PK (uuid) | |
| name | TEXT NOT NULL | nombre del perfil (ej. "Dev", "Docente") |
| contact_json | TEXT (JSON) | email, teléfono, ciudad; ≥1 contacto válido |
| summary | TEXT | resumen profesional opcional |
| is_active | INTEGER 0/1 | exactamente UNO activo por instalación (CHECK + uniqueness parcial) |
| created_at / updated_at | TEXT ISO-8601 | |

**Transiciones**: creación → activación (desactiva a los demás en la misma tx). Borrado de perfil activo exige seleccionar otro o quedar sin perfiles (estado onboarding).

### experience
id PK · profile_id FK · company · role · location? · start_date (YYYY-MM) · end_date? (NULL = presente) · achievements_json (bullets[]) · tags[] · sort_order. Validación: start ≤ end; al menos 1 achievement.

### education
id PK · profile_id FK · institution · degree · field? · start_date · end_date? · status (`in_progress`/`completed`) · credential_ref → documents.id?

### skill
id PK · profile_id FK · name · category (`technical`/`soft`/`language`) · level? (1–5 para technical/soft) · cefr? (A1–C2, requerido si category=`language`). Unicidad (profile_id, lower(name), category).

### project
id PK · profile_id FK · name · description? · tech[] · highlights[] · url?

### assessment
id PK · profile_id FK · type (`kolbe`/`cliftonstrengths`/`16personalities`/`disc`/`mbti`/`other`) · taken_on DATE? · results_json (estructura según type; `other` = free-form validado no-vacío) · document_ref FK documents.id. Unicidad (profile_id, type, taken_on).

### document
id PK · profile_id FK · original_name · stored_path (data/uploads/) · mime · kind (`diploma`/`cv`/`assessment_result`/`certificate`/`transcript`/`other`) · description · extracted_json (JSON schema-validado por kind) · extraction_meta_json ({model, extracted_at, confidence?, pages?}) · status (`pending`→`reviewed`→`imported`; `error` con error_message).

**Transiciones**: upload → `pending` → extracción IA OK → sigue `pending` con extracted_json → usuario edita/revisa → `reviewed` → import aprobado vía diff → `imported`. Re-extracción vuelve a `pending` preservando historial en meta (array de extracciones). Error de extracción → `error` (reintentable). Eliminación de documento NO borra entidades ya importadas (solo rompe trazabilidad → se marca orphaned).

### imported_entity (trazabilidad FR-010)
document_id FK · target_table (`experiences`/`education`/`skills`/`projects`/`assessments`/`profile`) · target_id · fields_imported[]. Único dueño del merge/duplicado: import repetido consulta esta tabla para proponer diff de actualización en vez de duplicar.

### job_posting
id PK · profile_id FK · source (`text`/`image`) · raw_text · image_ref → documents-like stored_path? · parsed_json ({title, company, hard_requirements[], nice_to_have[], keywords[], language}) · status (`draft`/`parsed`) · created_at.

### generated_cv
id PK · profile_id FK · posting_id FK? (NULL = CV general) · template_id (`ats-classic-v1`) · content_json (snapshot completo e inmutable del CV renderizado: datos usados + bullets finales + idioma) · data_snapshot_json (copia de las filas de perfil usadas — garantiza SC-005 reproducibilidad) · score_json ({mechanical:{checks[]}, semantic:{rubric}, total}) · exports ({pdf_path, md_path, json_path}) · language · parent_cv_id? (iteración desde snapshot previo) · created_at.

**Inmutabilidad**: UPDATE prohibido salvo score_json (re-evaluación explícita) y exports (re-export). Iterar = INSERT nuevo con parent_cv_id. DELETE manual habilitado (retención ilimitada, borrado manual — Clarifications Q3).

### setting (singleton row)
provider_preset (`openai`/`groq`/`openrouter`/`ollama`/`lmstudio`/`custom`) · base_url · api_key (texto plano en archivo gitignored aparte `data/credentials.json`, nunca en DB ni logs) · model · vision_capable (detectado) · ui_language (`es`/`en`) · log_level.

## Relaciones (resumen)

```
profile 1─* experience / education / skill / project / assessment
profile 1─* document ─* imported_entity *─1 (entidades de perfil)
profile 1─* job_posting 1─* generated_cv (posting opcional)
generated_cv *─1 generated_cv (parent_cv_id, iteraciones)
document 1─1 archivo binario en data/uploads/
assessment *─1 document (fuente)
```

## Reglas globales

- Toda fila lleva `created_at`/`updated_at` ISO-8601 UTC.
- Deletes de colecciones de perfil: soft-delete NO (YAGNI); confirmación en UI.
- Esquemas zod espejan cada tabla en `src/shared/schemas/` y son la única fuente de validación (server parse, client forms, AI output).
