import { z } from 'zod'
import { yearMonthSchema } from './dates'

export const educationStatusSchema = z.enum(['in_progress', 'completed'])

export const educationInputSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  start_date: yearMonthSchema,
  end_date: yearMonthSchema.nullable().optional(),
  status: educationStatusSchema.default('completed'),
  credential_ref: z.string().uuid().nullable().optional(),
})

export const educationCreateSchema = educationInputSchema.refine(
  (e) => !e.end_date || e.end_date >= e.start_date,
  {
    message: 'end_date debe ser ≥ start_date',
    path: ['end_date'],
  },
)

export type EducationCreate = z.infer<typeof educationCreateSchema>

export const educationSchema = educationCreateSchema.extend({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Education = z.infer<typeof educationSchema>
