import { z } from 'zod'

export const skillCategorySchema = z.enum(['technical', 'soft', 'language'])
export const cefrSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

const skillInputSchema = z.object({
  name: z.string().min(1),
  category: skillCategorySchema,
  level: z.number().int().min(1).max(5).nullable().optional(),
  cefr: cefrSchema.nullable().optional(),
})

export const skillCreateSchema = skillInputSchema.superRefine((s, ctx) => {
  if (s.category === 'language' && !s.cefr) {
    ctx.addIssue({ code: 'custom', path: ['cefr'], message: 'cefr requerido para languages' })
  }
  if (s.category === 'language' && s.level != null) {
    ctx.addIssue({ code: 'custom', path: ['level'], message: 'language usa cefr, no level numérico' })
  }
})

/** versión sin refinements para omit/partial en rutas */
export const skillInputObjectSchema = skillInputSchema

export type SkillCreate = z.infer<typeof skillCreateSchema>

export const skillSchema = skillCreateSchema.extend({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Skill = z.infer<typeof skillSchema>
