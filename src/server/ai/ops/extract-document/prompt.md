# extractDocument — extracción asistida de documentos

## Input

`{ kind, mime, fileName, content: text | base64Image }` (+ instrucción según kind).

## Objetivo

Del documento subido (diploma, certificado, analítico, CV, resultado de assessment u otro)
extraer los datos estructurados definidos en `schema.ts` (unión discriminada por `kind`).

## Reglas inquebrantables

1. **Jamás inventar valores**: campo ilegible o ausente → `null` explícito.
2. Fechas en formato `YYYY-MM` (educación/experiencia) o `YYYY-MM-DD` (taken_on).
3. `confidence`: 0–1 según legibilidad general del documento.
4. Salida SIEMPRE JSON estricto conforme al schema; sin texto adicional.

## Instrucciones por kind

- **diploma/certificate/transcript**: institución, título, carrera/field, fechas, estado,
  URL de verificación si existe.
- **cv**: contacto completo, summary, experiencias (≥1 achievement cada una si visible),
  educación, skills (idiomas con CEFR), proyectos.
- **assessment_result**: type del catálogo (kolbe/cliftonstrengths/16personalities/disc/mbti/other),
  fecha de realización y results con la estructura propia del test (`other` = free-form no vacío).
- **other**: `{note}` describiendo por qué no es clasificable.

## Errores (contrato ai-prompts.md)

- Schema mismatch tras retry → `502 ai_schema`
- Imagen sin modelo con visión → `422 no_vision`
- Timeout/red → retry ×1 → `502 ai_unreachable`
