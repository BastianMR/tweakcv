# evaluateCv — evaluación semántica del CV contra una postulación

## Input

`{cvContent, parsedPosting}`

## Output

`{rubric:[{criterion, score:0-10, evidence, suggestion?}], topSuggestions[≤5]}`

La parte mecánica NO es responsabilidad de esta op (la calcula `src/server/ats/` sin IA).

## Reglas

1. Cada criterio de la rúbrica cita **evidencia textual** del propio cvContent.
2. Score 0–10 por criterio; sugerencias accionables y honestas.
3. Jamás inventar requisitos que no estén en parsedPosting.
4. Salida SIEMPRE JSON estricto conforme al schema.
