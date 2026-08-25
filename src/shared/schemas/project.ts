import { z } from 'zod'

export const projectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tech: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  url: z.string().url().nullable().optional(),
  sort_order: z.number().int().default(0),
})

export type ProjectCreate = z.infer<typeof projectInputSchema>

export const projectCreateSchema = projectInputSchema

export const projectSchema = projectCreateSchema.extend({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Project = z.infer<typeof projectSchema>
