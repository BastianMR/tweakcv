import { z } from 'zod'
import { getDb } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'

type Coll = 'experiences' | 'education' | 'skills' | 'projects' | 'assessments'

const TABLE: Record<Coll, string> = {
  experiences: 'experience',
  education: 'education',
  skills: 'skill',
  projects: 'project',
  assessments: 'assessment',
}

export interface ImportOp {
  action: 'create' | 'update'
  coll: Coll
  id?: string
  fields: Record<string, unknown>
}

export interface DiffField {
  old: unknown
  new: unknown
}

export interface PreviewOp {
  action: 'create' | 'update'
  coll: Coll
  id?: string
  /** create: valor final por campo · update: diff old→new solo campos que cambian */
  fields: Record<string, DiffField>
}

interface DocumentRow {
  id: string
  profile_id: string
  kind: string
  extracted_json: string | null
  status: string
  updated_at: string
}

interface ImportedEntityRow {
  id: string
  document_id: string | null
  target_table: string
  target_id: string
  fields_imported_json: string
  orphaned: 0 | 1
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

/** mapea extracted_json (por kind) a payloads por colección */
function payloadFromExtracted(kind: string, extracted: Record<string, unknown>): Array<{ coll: Coll; fields: Record<string, unknown> }> {
  const out: Array<{ coll: Coll; fields: Record<string, unknown> }> = []

  if (kind === 'diploma' || kind === 'certificate' || kind === 'transcript') {
    out.push({
      coll: 'education',
      fields: {
        institution: extracted.institution ?? '',
        degree: extracted.title ?? '',
        ...(extracted.field != null && { field: extracted.field }),
        start_date: extracted.startDate ?? currentMonth(),
        end_date: extracted.endDate ?? null,
        status: extracted.status ?? 'completed',
      },
    })
    return out
  }

  if (kind === 'assessment_result') {
    out.push({
      coll: 'assessments',
      fields: {
        type: extracted.type ?? 'other',
        taken_on: extracted.takenOn ?? null,
        results_json: JSON.stringify(extracted.results ?? {}),
      },
    })
    return out
  }

  if (kind === 'cv') {
    for (const e of (extracted.experiences as Array<Record<string, unknown>>) ?? []) {
      if (!e.company || !e.role) continue
      out.push({
        coll: 'experiences',
        fields: {
          company: e.company,
          role: e.role,
          start_date: e.startDate ?? currentMonth(),
          end_date: e.endDate ?? null,
          achievements_json: JSON.stringify(e.achievements ?? ['·']),
          tags_json: '[]',
        },
      })
    }
    for (const e of (extracted.education as Array<Record<string, unknown>>) ?? []) {
      if (!e.institution || !e.degree) continue
      out.push({
        coll: 'education',
        fields: {
          institution: e.institution,
          degree: e.degree,
          start_date: e.startDate ?? currentMonth(),
          end_date: e.endDate ?? null,
          status: 'completed',
        },
      })
    }
    for (const s of (extracted.skills as Array<Record<string, unknown>>) ?? []) {
      if (!s.name) continue
      const isLang = s.category === 'language'
      out.push({
        coll: 'skills',
        fields: {
          name: s.name,
          category: s.category ?? 'technical',
          level: s.level ?? null,
          cefr: isLang ? (s.cefr ?? 'B2') : null,
        },
      })
    }
    for (const p of (extracted.projects as Array<Record<string, unknown>>) ?? []) {
      if (!p.name) continue
      out.push({
        coll: 'projects',
        fields: {
          name: p.name,
          tech_json: JSON.stringify(p.tech ?? []),
          highlights_json: JSON.stringify(p.highlights ?? []),
        },
      })
    }
  }
  return out
}

/**
 * FR-006: preview diff SIN escribir. Para cada payload propuesto:
 * - si ya hay imported_entity de este documento hacia esa tabla → update con diff por campo
 * - si no → create con valor final por campo
 */
export function buildImportPreview(documentId: string): { ops: PreviewOp[] } {
  const db = getDb()
  const doc = makeCrud<DocumentRow>(db, 'document').get(documentId)
  if (!doc) throw new ApiError('not_found', 'documento inexistente', 404)
  if (!doc.extracted_json) throw new ApiError('no_extraction', 'el documento no tiene datos extraídos', 409)

  const extracted = JSON.parse(doc.extracted_json) as Record<string, unknown>
  const proposed = payloadFromExtracted(doc.kind, extracted)
  const links = (
    db.prepare('SELECT * FROM imported_entity WHERE document_id = ? AND orphaned = 0').all(documentId) as ImportedEntityRow[]
  ).filter((l) => l.target_table !== 'profile')

  const ops: PreviewOp[] = []
  const usedTargets = new Set<string>()

  for (const p of proposed) {
    const table = TABLE[p.coll]
    const link = links.find((l) => l.target_table === p.coll && !usedTargets.has(l.id))
    if (link) {
      usedTargets.add(link.id)
      const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(link.target_id) as
        | Record<string, unknown>
        | undefined
      if (!existing) continue // entidad borrada manualmente: recrear sería sorpresa → omitir
      const fields: Record<string, DiffField> = {}
      let changed = false
      for (const [k, newVal] of Object.entries(p.fields)) {
        const oldVal =
          k in existing ? (k.endsWith('_json') ? JSON.parse(existing[k] as string) : existing[k]) : null
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          fields[k] = { old: oldVal ?? null, new: newVal }
          changed = true
        }
      }
      if (changed) ops.push({ action: 'update', coll: p.coll, id: link.target_id, fields })
    } else {
      const fields: Record<string, DiffField> = {}
      for (const [k, v] of Object.entries(p.fields)) fields[k] = { old: null, new: v }
      ops.push({ action: 'create', coll: p.coll, fields })
    }
  }
  return { ops }
}

const COLL_ENUM = z.enum(['experiences', 'education', 'skills', 'projects', 'assessments'])

const opSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), coll: COLL_ENUM, fields: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal('update'), coll: COLL_ENUM, id: z.string(), fields: z.record(z.string(), z.unknown()) }),
])

/** columnas reales de la tabla — defensa contra keys maliciosas en ops */
function knownColumns(table: string): Set<string> {
  const cols = getDb().pragma(`table_info(${table})`) as Array<{ name: string }>
  return new Set(cols.map((c) => c.name))
}

/**
 * FR-006/FR-010: aplica SOLO los ops aprobados en tx; registra imported_entity;
 * marca el documento como imported.
 */
export function applyImport(
  documentId: string,
  approvedOps: Array<ImportOp>,
): { imported: number } {
  const db = getDb()
  const docRepo = makeCrud<DocumentRow>(db, 'document')
  const doc = docRepo.get(documentId)
  if (!doc) throw new ApiError('not_found', 'documento inexistente', 404)
  if (!doc.extracted_json) throw new ApiError('no_extraction', 'sin datos extraídos', 409)
  if (doc.status === 'error') throw new ApiError('document_error', 'extracción en error', 409)

  const entityRepo = makeCrud<ImportedEntityRow & { id: string }>(db, 'imported_entity')

  let imported = 0
  db.transaction(() => {
    for (const raw of approvedOps) {
      const parsed = opSchema.safeParse(raw)
      if (!parsed.success) throw new ApiError('validation_error', `op inválida`, 400)
      const op = parsed.data
      const table = TABLE[op.coll]

      const allowed = knownColumns(table)
      for (const key of Object.keys(op.fields)) {
        if (!allowed.has(key)) {
          throw new ApiError('validation_error', `columna desconocida '${key}' para ${op.coll}`, 400)
        }
      }
      const keys = Object.keys(op.fields)

      // los ops vienen del preview con diff {old,new}: nos quedamos con .new
      const flatValues = keys.map((k) => {
        const v = op.fields[k]
        return v !== null && typeof v === 'object' && ('new' in (v as object) || 'old' in (v as object))
          ? (v as DiffField).new
          : v
      })

      if (op.action === 'create') {
        const id = crypto.randomUUID()
        db.prepare(
          `INSERT INTO ${table} (id, profile_id, ${keys.join(', ')}) VALUES (?, ?, ${keys.map(() => '?').join(', ')})`,
        ).run(id, doc.profile_id, ...flatValues)
        entityRepo.create({
          id: crypto.randomUUID(),
          document_id: documentId,
          target_table: op.coll,
          target_id: id,
          fields_imported_json: JSON.stringify(keys),
        })
      } else {
        const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(op.id) as
          | (Record<string, unknown> & { profile_id: string })
          | undefined
        if (!row || row.profile_id !== doc.profile_id) {
          throw new ApiError('not_found', `${op.coll}/${op.id} inexistente`, 404)
        }
        db.prepare(
          `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
        ).run(...flatValues, op.id)
        const existingLink = db
          .prepare('SELECT * FROM imported_entity WHERE document_id = ? AND target_table = ? AND target_id = ?')
          .get(documentId, op.coll, op.id) as ImportedEntityRow | undefined
        if (existingLink) {
          entityRepo.update(existingLink.id, {
            fields_imported_json: JSON.stringify([
              ...new Set([...JSON.parse(existingLink.fields_imported_json), ...keys]),
            ]),
            orphaned: 0,
          })
        } else {
          entityRepo.create({
            id: crypto.randomUUID(),
            document_id: documentId,
            target_table: table,
            target_id: op.id,
            fields_imported_json: JSON.stringify(keys),
          })
        }
      }
      imported++
    }

    docRepo.update(documentId, { status: 'imported', updated_at: new Date().toISOString() })
  })()

  return { imported }
}
