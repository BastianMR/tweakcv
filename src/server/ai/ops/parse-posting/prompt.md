# parsePosting — parseo de postulación de trabajo

## Input

Texto crudo de la postulación O imagen (mismo pipeline multimodal).

## Output

`{title, company?, language(es|en|otro ISO), hardRequirements[], niceToHave[], keywords[]}`

## Reglas inquebrantables

1. `keywords` = términos técnicos/herramientas/requisitos **literalmente presentes** en la fuente.
   Jamás inferir keywords que no aparecen.
2. `hardRequirements` vs `niceToHave`: separar por lenguaje explícito ("requiere/imprescindible" vs "deseable/plus").
3. `language` = idioma del texto fuente en ISO-639-1.
4. Campos ausentes → omitidos o null; jamás inventar.
5. Salida SIEMPRE JSON estricto conforme al schema.

## Errores (contrato ai-prompts.md)

- Imagen sin modelo con visión → `422 no_vision` (pre-check antes de gastar tokens)
- Schema mismatch tras retry → `502 ai_schema`
- Timeout/red → retry ×1 → `502 ai_unreachable`
