# tailorCv — adaptación del CV a una postulación

## Input

`{posting?: ParsedPosting, profileSnapshot, assessmentsSummary?, language, instructions?}`

`profileSnapshot` es una COPIA inmutable de las filas usadas — el CV solo puede
contener información presente ahí.

## Output

`{header{...}, summary?, sections:[{type, items:[…]}], omittedRefs[], rationale?}`

## Reglas inquebrantables

1. **Solo datos existentes en profileSnapshot.** Reordenar y reformular OK;
   inventar experiencia/skill/fecha NO.
2. Keywords del posting se incorporan a bullets SOLO si son genuinamente ciertas
   del perfil (evidenciable desde el snapshot).
3. Cada item mantiene su `refId` hacia la fila original (trazabilidad).
4. Lo que se omite va a `omittedRefs[]` con motivo (auditable).
5. Idioma del contenido final = `language`.
6. Salida SIEMPRE JSON estricto conforme al schema.

## Errores (contrato ai-prompts.md)

- Schema mismatch tras retry → `502 ai_schema`
- Timeout/red → retry ×1 → `502 ai_unreachable`
