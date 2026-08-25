# Contract: Operaciones LLM (prompts + I/O schemas)

Cliente: openai SDK ^7 con `baseURL`/`apiKey` de settings. Toda salida viaja como
`response_format json_schema strict` cuando el proveedor lo soporta; **siempre** se
re-valida server-side contra el zod correspondiente; 1 retry automático ante mismatch/error (FR-023).

Convención: cada op = carpeta `src/server/ai/ops/<op>/` con `prompt.md` + `schema.ts` (zod→JSON Schema).

## extractDocument

**Input**: `{kind, mime, fileName, content: text | base64Image}` (+ instrucción por kind).
**Output** (`ExtractedDocument`, union discriminada por kind):
- diploma/certificate/transcript: `{institution, title, field?, startDate?, endDate?, status?, credentialUrl?, confidence}`
- cv: `{contact{...}, summary?, experiences[], education[], skills[], projects[], languages[{name,cefr?}]}`
- assessment_result: `{type, takenOn?, results}` — results shape según catálogo (kolbe: factores+percentiles; cliftonstrengths: top-N temas; 16personalities: código + dimensiones %; disc: perfil + dimensiones; mbti: código; other: free-form no vacío)
- Regla dura: campos ilegibles → null explícito; jamás inventar valores.

## parsePosting

**Input**: texto crudo O imagen (mismo pipeline multimodal). **Output**:
`{title, company?, language(es|en|otro ISO), hardRequirements[], niceToHave[], keywords[]}`
— keywords = términos técnicos/herramientas/requisitos literalmente presentes en la fuente.

## tailorCv

**Input**: `{posting?: ParsedPosting, profileSnapshot, assessmentsSummary?, language, instructions?}`.
**Output**: contenido final del CV:
`{header{...}, summary?, sections:[{type:experience|education|skills|projects|assessments, items:[…con bullets reordenados/reescritos]}], omittedRefs[], rationale?}`
- Reglas inquebrantables en prompt: solo datos existentes en profileSnapshot; reordenar y reformular OK; inventar NO; keywords del posting incorporadas solo si son genuinamente ciertas del perfil.
- `omittedRefs`: qué se dejó fuera y por qué (auditable).

## evaluateCv

**Input**: `{cvContent, parsedPosting}`. **Output** (solo parte semántica):
`{rubric:[{criterion, score:0-10, evidence, suggestion?}], semanticScore:0-100, topSuggestions[≤5]}`
La parte mecánica la calcula `src/server/ats/` SIN IA (determinista, testeable unitario): cobertura keywords (presente/parcial/faltante con evidencia), encabezados estándar reconocidos, una columna, longitud, densidad de contacto. Score total = ponderación configurable interna (default 60% mecánica / 40% semántica).

## Errores

| Caso | Comportamiento |
|---|---|
| schema mismatch tras retry | error accionable al route → 502 `{code:'ai_schema'}` |
| modelo sin visión recibe imagen | pre-check `vision_capable` → 422 `{code:'no_vision'}` antes de gastar tokens |
| timeout / red | retry ×1 backoff → 502 `{code:'ai_unreachable', detail:url-host-only}` (jamás loguear key) |
