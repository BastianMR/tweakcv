import { z } from 'zod'

export const documentKindSchema = z.enum([
  'diploma',
  'cv',
  'assessment_result',
  'certificate',
  'transcript',
  'other',
])

export const extractionStateSchema = z.enum(['queued', 'running', 'done', 'error'])

export const extractionMetaSchema = z.object({
  state: extractionStateSchema,
  model: z.string().optional(),
  extracted_at: z.string().optional(),
  confidence: z.number().optional(),
  pages: z.number().optional(),
  error_message: z.string().optional(),
})

export const documentStatusSchema = z.enum(['pending', 'reviewed', 'imported', 'error'])

const documentBase = z.object({
  // SIN default: un PATCH que omite kind no debe cambiarlo
  kind: documentKindSchema.optional(),
  description: z.string().default(''),
})

/** PATCH /documents/:id */
export const documentPatchSchema = documentBase.partial().extend({
  extracted_json: z.unknown().optional(),
})

/** body del upload multipart (kind opcional, se infiere si falta) */
export const documentUploadMetaSchema = documentBase

export interface DocumentRow {
  id: string
  profile_id: string
  original_name: string
  stored_path: string
  mime: string
  kind: z.infer<typeof documentKindSchema>
  description: string
  extracted_json: string | null
  extraction_meta_json: string
  status: z.infer<typeof documentStatusSchema>
  created_at: string
  updated_at: string
}

/** shape API de la grilla (contrato api.md) */
export function toDocumentApi(row: DocumentRow) {
  return {
    id: row.id,
    name: row.original_name,
    mime: row.mime,
    kind: row.kind,
    description: row.description,
    status: row.status,
    extracted: row.extracted_json ? (JSON.parse(row.extracted_json) as unknown) : null,
    extraction_meta: JSON.parse(row.extraction_meta_json) as Record<string, unknown>,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
