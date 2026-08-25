import { z } from 'zod'

export const contactSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    city: z.string().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
  })
  .refine(
    (c) => Object.values(c).some((v) => v !== undefined && v.length > 0),
    'al menos un medio de contacto',
  )

export type Contact = z.infer<typeof contactSchema>

export const profileCreateSchema = z.object({
  name: z.string().min(1),
  // opcional al crear (contrato api.md): onboarding permite perfil básico sin contacto
  contact: contactSchema.optional(),
  summary: z.string().optional(),
})

export type ProfileCreate = z.infer<typeof profileCreateSchema>

export const profileSchema = profileCreateSchema.extend({
  id: z.string().uuid(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Profile = z.infer<typeof profileSchema>
