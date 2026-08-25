import { z } from 'zod'

/** contenido inmutable del CV generado (contrato ai-prompts.md tailorCv) */

const experienceItem = z.object({
  refId: z.string(),
  company: z.string(),
  role: z.string(),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  bullets: z.array(z.string()).min(1),
})

const educationItem = z.object({
  refId: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

const skillItem = z.object({
  refId: z.string(),
  name: z.string(),
  category: z.enum(['technical', 'soft', 'language']),
  level: z.number().int().min(1).max(5).nullable().optional(),
  cefr: z.string().nullable().optional(),
})

const projectItem = z.object({
  refId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  tech: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  url: z.string().nullable().optional(),
})

export const sectionTypes = ['experience', 'education', 'skills', 'projects'] as const

export const tailoredCvSchema = z.object({
  header: z.object({
    name: z.string().min(1),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
  }),
  summary: z.string().nullable().optional(),
  sections: z.array(
    z.union([
      z.object({ type: z.literal('experience'), items: z.array(experienceItem) }),
      z.object({ type: z.literal('education'), items: z.array(educationItem) }),
      z.object({ type: z.literal('skills'), items: z.array(skillItem) }),
      z.object({ type: z.literal('projects'), items: z.array(projectItem) }),
    ]),
  ),
  /** qué se dejó fuera y por qué (auditable, contrato) */
  omittedRefs: z
    .array(z.object({ coll: z.string(), id: z.string(), reason: z.string() }))
    .default([]),
  rationale: z.string().nullable().optional(),
})

export type TailoredCv = z.infer<typeof tailoredCvSchema>
export type ExperienceItem = z.infer<typeof experienceItem>
export type EducationItem = z.infer<typeof educationItem>
export type SkillItem = z.infer<typeof skillItem>
export type ProjectItem = z.infer<typeof projectItem>

/** fila generated_cv (inmutable salvo score_json y exports) */
export interface CvRow {
  id: string
  profile_id: string
  posting_id: string | null
  template_id: string
  content_json: string
  data_snapshot_json: string
  score_json: string | null
  exports_json: string
  language: string
  parent_cv_id: string | null
  created_at: string
}

export function toCvApi(row: CvRow, opts?: { full?: boolean }) {
  const base = {
    id: row.id,
    posting_id: row.posting_id,
    template_id: row.template_id,
    language: row.language,
    parent_cv_id: row.parent_cv_id,
    score: row.score_json ? (JSON.parse(row.score_json) as unknown) : null,
    exports: JSON.parse(row.exports_json) as Record<string, string>,
    created_at: row.created_at,
  }
  if (!opts?.full) return base
  return {
    ...base,
    content: JSON.parse(row.content_json) as unknown,
    data_snapshot: JSON.parse(row.data_snapshot_json) as unknown,
  }
}
