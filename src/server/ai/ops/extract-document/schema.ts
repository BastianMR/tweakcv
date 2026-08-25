import { z } from 'zod'
import { cefrSchema } from '../../../../shared/schemas/skill'
import { yearMonthSchema } from '../../../../shared/schemas/dates'

/**
 * ExtractedDocument (contrato ai-prompts.md): unión discriminada por kind.
 * Regla dura: campos ilegibles → null explícito; jamás inventar valores.
 */

const confidence = z.number().min(0).max(1)

const credentialExtracted = z.object({
  institution: z.string().nullable(),
  title: z.string().nullable(),
  field: z.string().nullable().optional(),
  startDate: yearMonthSchema.nullable().optional(),
  endDate: yearMonthSchema.nullable().optional(),
  status: z.enum(['in_progress', 'completed']).nullable().optional(),
  credentialUrl: z.string().url().nullable().optional(),
  confidence,
})

const contactExtracted = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
})

const cvExperienceExtracted = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  location: z.string().nullable().optional(),
  startDate: yearMonthSchema.nullable().optional(),
  endDate: yearMonthSchema.nullable().optional(),
  achievements: z.array(z.string()).default([]),
})

const cvEducationExtracted = z.object({
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  field: z.string().nullable().optional(),
  startDate: yearMonthSchema.nullable().optional(),
  endDate: yearMonthSchema.nullable().optional(),
})

const cvSkillExtracted = z.object({
  name: z.string().nullable(),
  category: z.enum(['technical', 'soft', 'language']).nullable().optional(),
  level: z.number().int().min(1).max(5).nullable().optional(),
  cefr: cefrSchema.nullable().optional(),
})

const cvProjectExtracted = z.object({
  name: z.string().nullable(),
  description: z.string().nullable().optional(),
  tech: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  url: z.string().url().nullable().optional(),
})

const cvExtracted = z.object({
  contact: contactExtracted,
  summary: z.string().nullable().optional(),
  experiences: z.array(cvExperienceExtracted).default([]),
  education: z.array(cvEducationExtracted).default([]),
  skills: z.array(cvSkillExtracted).default([]),
  projects: z.array(cvProjectExtracted).default([]),
})

const assessmentResultExtracted = z.object({
  type: z.enum(['kolbe', 'cliftonstrengths', '16personalities', 'disc', 'mbti', 'other']),
  takenOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  /** estructura libre según catálogo; `other` exige no-vacío */
  results: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
})

export const extractedDocumentSchema = z.discriminatedUnion('kind', [
  credentialExtracted.extend({ kind: z.literal('diploma') }),
  credentialExtracted.extend({ kind: z.literal('certificate') }),
  credentialExtracted.extend({ kind: z.literal('transcript') }),
  cvExtracted.extend({ kind: z.literal('cv'), confidence }),
  assessmentResultExtracted.extend({ kind: z.literal('assessment_result') }),
  z.object({ kind: z.literal('other'), note: z.string().nullable().optional() }),
])

export type ExtractedDocument = z.infer<typeof extractedDocumentSchema>

// --- fixtures deterministas para el preset mock ---

export const MOCK_EXTRACTED: Record<string, ExtractedDocument> = {
  diploma: {
    kind: 'diploma',
    institution: 'Universidad de Buenos Aires',
    title: 'Ingeniería en Informática',
    field: null,
    startDate: '2015-03',
    endDate: '2021-12',
    status: 'completed',
    credentialUrl: null,
    confidence: 0.9,
  },
  certificate: {
    kind: 'certificate',
    institution: 'AWS',
    title: 'Cloud Practitioner',
    field: null,
    startDate: null,
    endDate: null,
    status: 'completed',
    credentialUrl: 'https://aws.amazon.com/verification',
    confidence: 0.85,
  },
  transcript: {
    kind: 'transcript',
    institution: 'UBA',
    title: 'Historia académica',
    field: null,
    startDate: '2015-03',
    endDate: null,
    status: 'in_progress',
    credentialUrl: null,
    confidence: 0.7,
  },
  assessment_result: {
    kind: 'assessment_result',
    type: 'mbti',
    takenOn: '2025-06-01',
    results: { code: 'INTJ' },
  },
}

export function mockExtractFor(kind: string, fileName: string): ExtractedDocument {
  if (kind === 'assessment_result') return MOCK_EXTRACTED.assessment_result!
  if (kind === 'certificate') return MOCK_EXTRACTED.certificate!
  if (kind === 'transcript') return MOCK_EXTRACTED.transcript!
  if (kind === 'diploma') return MOCK_EXTRACTED.diploma!
  if (kind === 'cv') {
    const isCvFile = /cv|resume|curr[ií]culum/i.test(fileName)
    if (!isCvFile) throw new Error(`mock cv extraction requiere nombre tipo CV, recibió: ${fileName}`)
    return {
      kind: 'cv',
      confidence: 0.88,
      contact: { name: 'Basma Test', email: 'basma@example.com', phone: '+54 11 0000-0000', city: 'Buenos Aires' },
      summary: 'Perfil extraído por fixture mock.',
      experiences: [
        {
          company: 'Acme Corp',
          role: 'Backend Developer',
          location: null,
          startDate: '2022-01',
          endDate: null,
          achievements: ['Diseñó API de pagos', 'Redujo latencia 30%'],
        },
      ],
      education: [
        { institution: 'UBA', degree: 'Ing. Informática', field: null, startDate: '2015-03', endDate: '2021-12' },
      ],
      skills: [
        { name: 'TypeScript', category: 'technical', level: 4 },
        { name: 'Inglés', category: 'language', level: null, cefr: 'C1' },
      ],
      projects: [{ name: 'TweakCV', description: null, tech: ['ts', 'react'], highlights: [], url: null }],
    }
  }
  return { kind: 'other', note: `contenido no estructurado en ${fileName}` }
}
