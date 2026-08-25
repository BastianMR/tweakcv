import { z } from 'zod'

export const postingLanguageSchema = z.string().min(2).max(3)

/** parsed_json de una postulación (contrato ai-prompts.md parsePosting) */
export const parsedPostingSchema = z.object({
  title: z.string().min(1),
  company: z.string().nullable().optional(),
  language: postingLanguageSchema,
  hardRequirements: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
  /** términos técnicos/herramientas literalmente presentes en la fuente */
  keywords: z.array(z.string()).default([]),
})

export type ParsedPosting = z.infer<typeof parsedPostingSchema>

export const postingPatchSchema = z.object({
  title: z.string().min(1).optional(),
  company: z.string().nullish(),
  language: postingLanguageSchema.optional(),
  hardRequirements: z.array(z.string()).optional(),
  niceToHave: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
})

export interface PostingRow {
  id: string
  profile_id: string
  source: 'text' | 'image'
  raw_text: string | null
  image_ref: string | null
  parsed_json: string | null
  status: 'draft' | 'parsed'
  created_at: string
  updated_at: string
}

export function toPostingApi(row: PostingRow) {
  return {
    id: row.id,
    source: row.source,
    raw_text: row.raw_text,
    has_image: row.image_ref !== null,
    parsed: row.parsed_json ? (JSON.parse(row.parsed_json) as unknown) : null,
    status: row.status,
    created_at: row.created_at,
  }
}
