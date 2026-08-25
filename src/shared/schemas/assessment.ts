import { z } from 'zod'

export const assessmentTypeSchema = z.enum([
  'kolbe',
  'cliftonstrengths',
  '16personalities',
  'disc',
  'mbti',
  'other',
])

export const assessmentInputSchema = z.object({
  type: assessmentTypeSchema,
  taken_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato YYYY-MM-DD')
    .nullable()
    .optional(),
  results: z.unknown(), // validado por catálogo según type al importar
})

export type AssessmentInput = z.infer<typeof assessmentInputSchema>

export const assessmentSchema = assessmentInputSchema.extend({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  document_ref: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Assessment = z.infer<typeof assessmentSchema>
