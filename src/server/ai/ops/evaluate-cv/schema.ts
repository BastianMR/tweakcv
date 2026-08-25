import { z } from 'zod'

/** parte semántica del contrato ai-prompts.md evaluateCv */
export const semanticEvaluationSchema = z.object({
  rubric: z
    .array(
      z.object({
        criterion: z.string().min(1),
        score: z.number().int().min(0).max(10),
        evidence: z.string().min(1),
        suggestion: z.string().optional(),
      }),
    )
    .min(3)
    .max(8),
  topSuggestions: z.array(z.string().min(1)).max(5).default([]),
})

export type SemanticEvaluation = z.infer<typeof semanticEvaluationSchema>

interface EvalInput {
  cvContent: Record<string, unknown>
  parsedPosting: Record<string, unknown> | null
}

/** rúbrica determinista para el preset mock (sin red) */
export function mockEvaluate({ cvContent, parsedPosting }: EvalInput): SemanticEvaluation {
  const sections = (cvContent.sections ?? []) as Array<{ type: string; items: unknown[] }>
  const expItems = sections.find((s) => s.type === 'experience')?.items as
    | Array<{ bullets?: string[] }>
    | undefined
  const bulletCount =
    expItems?.reduce((n, e) => n + (e.bullets?.length ?? 0), 0) ?? 0

  const keywords = ((parsedPosting?.keywords ?? []) as string[]).map((k) => k.toLowerCase())
  const text = JSON.stringify(cvContent).toLowerCase()
  const covered = keywords.filter((k) => text.includes(k))
  const missing = keywords.filter((k) => !text.includes(k))

  const keywordRatio = keywords.length > 0 ? covered.length / keywords.length : 1

  const rubric = [
    {
      criterion: 'Alineación con keywords de la postulación',
      score: Math.round(keywordRatio * 10),
      evidence:
        keywords.length > 0
          ? `${covered.length}/${keywords.length} keywords presentes (${covered.join(', ') || 'ninguna'})`
          : 'CV general sin posting asociado',
      ...(missing.length > 0 && {
        suggestion: `Incorporar evidencia genuina de: ${missing.join(', ')}`,
      }),
    },
    {
      criterion: 'Impacto cuantificado en experiencia',
      score: Math.min(10, bulletCount * 2),
      evidence: `${bulletCount} bullets en experiencia`,
      ...(bulletCount < 4 && { suggestion: 'Agregar logros con métricas (%, tiempo, escala)' }),
    },
    {
      criterion: 'Estructura y legibilidad ATS',
      score: sections.length >= 3 ? 9 : 6,
      evidence: `${sections.length} secciones estándar`,
    },
    {
      criterion: 'Resumen profesional alineado al puesto',
      score: cvContent.summary ? 8 : 4,
      evidence: cvContent.summary ? 'summary presente' : 'falta summary',
      ...(cvContent.summary ? {} : { suggestion: 'Redactar un summary orientado al puesto' }),
    },
  ]

  const topSuggestions = [
    ...missing.slice(0, 3).map((k) => `Sumar evidencia real de "${k}" si corresponde`),
    ...(bulletCount < 4 ? ['Cuantificar más logros en experiencia'] : []),
    ...(cvContent.summary ? [] : ['Agregar summary profesional']),
  ].slice(0, 5)

  return { rubric, topSuggestions }
}
