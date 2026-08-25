import { z } from 'zod'
import { yearMonthSchema } from './dates'

export const experienceInputSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  start_date: yearMonthSchema,
  end_date: yearMonthSchema.nullable().optional(),
  achievements: z.array(z.string().min(1)).min(1, 'al menos un achievement'),
  tags: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
})

export const experienceCreateSchema = experienceInputSchema.refine(
  (e) => !e.end_date || e.end_date >= e.start_date,
  {
    message: 'end_date debe ser ≥ start_date',
    path: ['end_date'],
  },
)

export type ExperienceCreate = z.infer<typeof experienceCreateSchema>

export const experienceSchema = experienceCreateSchema.extend({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Experience = z.infer<typeof experienceSchema>
