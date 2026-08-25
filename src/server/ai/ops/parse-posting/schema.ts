import { z } from 'zod'
import { parsedPostingSchema } from '../../../../shared/schemas/posting'

export const parsePostingOutputSchema = parsedPostingSchema
export type ParsePostingOutput = z.infer<typeof parsePostingOutputSchema>

/** fixture determinista para el preset mock (E2E sin red ni keys) */
export const MOCK_PARSE: ParsePostingOutput = {
  title: 'Backend Developer',
  company: 'Acme Corp',
  language: 'es',
  hardRequirements: ['3+ años de experiencia', 'TypeScript avanzado'],
  niceToHave: ['Experiencia con PostgreSQL'],
  keywords: ['typescript', 'node.js', 'postgresql', 'api rest'],
}
