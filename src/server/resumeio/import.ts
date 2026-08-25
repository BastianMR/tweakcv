import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv from 'ajv'
import type { ValidateFunction } from 'ajv'
import { getDb, dataDir } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'

interface DocumentRow {
  id: string
  profile_id: string
  original_name: string
  stored_path: string
  mime: string
  kind: string
  description: string
  extracted_json: string | null
  extraction_meta_json: string
  status: 'pending' | 'reviewed' | 'imported' | 'error'
  updated_at?: string
}

// FR-017: validación contra el JSON Resume Schema bundled
const require = createRequire(import.meta.url)
let validateResume: ValidateFunction | null = null

function validator(): ValidateFunction {
  if (!validateResume) {
    const schemaPath = require.resolve('@jsonresume/schema/schema.json')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object
    // strict:false: el schema usa format "uri" y no queremos depender de ajv-formats
    validateResume = new Ajv({ allErrors: true, strict: false }).compile(schema)
  }
  return validateResume
}

/** contrato json-resume-mapping.md: el export SIEMPRE válido contra el schema oficial */
export function validateExportedResume(jsonResume: unknown): void {
  const ok = validator()(jsonResume)
  if (!ok) {
    throw new ApiError('internal', 'bug: export JSON Resume inválido', 500)
  }
}

/** YYYY-MM-DD | YYYY-MM | undefined → YYYY-MM | undefined */
function toMonth(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 7) return null
  return value.slice(0, 7)
}

type Rec = Record<string, unknown>

/** mapea un resume.json válido a nuestro ExtractedDocument de tipo cv */
export function mapResumeToCv(resume: Rec): Rec {
  const basics = (resume.basics ?? {}) as Rec
  const location = (basics.location ?? {}) as Rec

  const experiences = ((resume.work ?? []) as Rec[])
    .filter((w) => w.name && w.position)
    .map((w) => ({
      company: w.name,
      role: w.position,
      startDate: toMonth(w.startDate),
      endDate: toMonth(w.endDate),
      achievements: Array.isArray(w.highlights) && w.highlights.length > 0 ? w.highlights : [String(w.summary ?? '·')],
    }))

  const education = ((resume.education ?? []) as Rec[])
    .filter((e) => e.institution && (e.studyType || e.area))
    .map((e) => ({
      institution: e.institution,
      degree: e.studyType ?? e.area,
      field: e.area ?? null,
      startDate: toMonth(e.startDate),
      endDate: toMonth(e.endDate),
    }))

  const skills = ((resume.skills ?? []) as Rec[])
    .filter((s) => s.name)
    .map((s) => ({ name: s.name, category: 'technical', level: null, cefr: null }))

  const languages = ((resume.languages ?? []) as Rec[])
    .filter((l) => l.language)
    .map((l) => ({ name: l.language, category: 'language', level: null, cefr: null }))

  const projects = ((resume.projects ?? []) as Rec[])
    .filter((p) => p.name)
    .map((p) => ({
      name: p.name,
      description: typeof p.description === 'string' ? p.description : null,
      tech: [],
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      url: typeof p.url === 'string' && p.url.length > 0 ? p.url : null,
    }))

  return {
    kind: 'cv',
    confidence: 1,
    contact: {
      name: basics.name ?? null,
      email: basics.email ?? null,
      phone: basics.phone ?? null,
      city: location.city ?? null,
      linkedin: null,
      website: basics.website ?? null,
    },
    summary: typeof basics.summary === 'string' ? basics.summary : null,
    experiences,
    education,
    skills: [...skills, ...languages],
    projects,
  }
}

/**
 * Import resume.json (FR-017): valida con ajv contra el schema bundled y crea
 * un documento virtual kind=cv ya extraído → entra al mismo flujo human-in-the-loop.
 */
export function importResumeJson(resume: unknown): { id: string; kind: string; status: string } {
  const valid = validator()(resume)
  if (!valid) {
    throw new ApiError('validation_error', 'el archivo no es un resume.json válido', 400)
  }

  const db = getDb()
  const active = makeCrud<{ id: string; is_active: number }>(db, 'profile').list({ is_active: 1 })[0]
  if (!active) throw new ApiError('no_profile', 'no hay perfil activo', 404)

  const rec = resume as Rec
  const id = crypto.randomUUID()
  const storedPath = join('uploads', `${id}-resume.json`)
  mkdirSync(join(dataDir(), 'uploads'), { recursive: true })
  writeFileSync(join(dataDir(), storedPath), JSON.stringify(rec, null, 2), 'utf8')

  const extracted = mapResumeToCv(rec)
  makeCrud<DocumentRow>(db, 'document').create({
    id,
    profile_id: active.id,
    original_name: 'resume.json',
    stored_path: storedPath.replaceAll('\\', '/'),
    mime: 'application/json',
    kind: 'cv',
    extracted_json: JSON.stringify(extracted),
    extraction_meta_json: JSON.stringify({
      state: 'done',
      model: 'jsonresume-import',
      extracted_at: new Date().toISOString(),
    }),
    // datos estructurados de confianza: nace revisado, listo para importar
    status: 'reviewed',
  })

  return { id, kind: 'cv', status: 'reviewed' }
}
