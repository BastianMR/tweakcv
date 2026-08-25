import type { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'
import { profileCreateSchema } from '../../shared/schemas/profile'
import {
  assessmentInputSchema,
  educationCreateSchema,
  educationInputSchema,
  experienceCreateSchema,
  experienceInputSchema,
  projectCreateSchema,
  projectInputSchema,
  skillCreateSchema,
  skillInputObjectSchema,
} from '../../shared/schemas'
import { expandJsonCols, mapUniqueViolation, parseBody } from './shared'
import { requireActiveProfile } from './shared'
import type { ProfileRow } from './shared'

function toApi(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    contact: JSON.parse(row.contact_json ?? '{}') as Record<string, unknown>,
    summary: row.summary,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function repo() {
  return makeCrud<ProfileRow>(getDb(), 'profile')
}


const COLLECTIONS = ['experiences', 'education', 'skills', 'projects', 'assessments'] as const

export function registerProfileRoutes(app: Hono) {
  // /active antes que /:id para que el match sea determinista
  app.get('/api/profiles/active', (c) => {
    const active = requireActiveProfile()
    const db = getDb()
    const collections: Record<string, unknown[]> = {}
    for (const coll of COLLECTIONS) {
      const table = COLL_TABLE[coll]
      const rows = makeCrud<CollRow>(db, table).list({ profile_id: active.id })
      collections[coll] = rows.map((r) => expandJsonCols(r, JSON_COLS[table] ?? []))
    }
    return c.json({ profile: toApi(active), ...collections })
  })

  app.get('/api/profiles', (c) => c.json(repo().list().map(toApi)))

  app.post('/api/profiles', async (c) => {
    const body = parseBody(profileCreateSchema, await c.req.json())
    const isFirst = repo().list().length === 0
    try {
      const created = repo().create({
        id: crypto.randomUUID(),
        name: body.name,
        contact_json: JSON.stringify(body.contact ?? {}),
        ...(body.summary !== undefined && { summary: body.summary }),
        is_active: isFirst ? 1 : 0,
      })
      return c.json(toApi(created), 201)
    } catch (err) {
      mapUniqueViolation(err, 'idx_profile_one_active', 'profile_active_conflict', 'ya existe un perfil activo')
      throw err
    }
  })

  app.patch('/api/profiles/:id', async (c) => {
    const id = c.req.param('id')
    const Body = z.object({
      name: z.string().min(1).optional(),
      contact: profileCreateSchema.shape.contact.optional(),
      summary: z.string().nullish(),
    })
    const body = parseBody(Body, await c.req.json())
    const patch: Partial<ProfileRow> = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.summary !== undefined) patch.summary = body.summary
    if (body.contact !== undefined) patch.contact_json = JSON.stringify(body.contact)
    const updated = repo().update(id, patch)
    if (!updated) throw new ApiError('not_found', 'perfil inexistente', 404)
    return c.json(toApi(updated))
  })

  app.delete('/api/profiles/:id', (c) => {
    const id = c.req.param('id')
    const all = repo().list()
    if (all.length === 1 && all[0]?.id === id) {
      throw new ApiError('cannot_delete_last_profile', 'no se puede borrar el único perfil', 409)
    }
    if (!repo().remove(id)) throw new ApiError('not_found', 'perfil inexistente', 404)
    return c.body(null, 204)
  })

  app.post('/api/profiles/:id/activate', (c) => {
    const id = c.req.param('id')
    const r = repo()
    if (!r.get(id)) throw new ApiError('not_found', 'perfil inexistente', 404)
    getDb().transaction(() => {
      getDb().prepare('UPDATE profile SET is_active = 0 WHERE is_active = 1').run()
      getDb().prepare('UPDATE profile SET is_active = 1 WHERE id = ?').run(id)
    })()
    return c.json({ ok: true, id })
  })
}

// --- colecciones ---

const COLL_TABLE = {
  experiences: 'experience',
  education: 'education',
  skills: 'skill',
  projects: 'project',
  assessments: 'assessment',
} as const

const JSON_COLS: Record<string, readonly string[]> = {
  experience: ['achievements', 'tags'],
  project: ['tech', 'highlights'],
  assessment: ['results'],
}

type CollRow = Record<string, unknown> & { id: string }

function toApiRow(table: string, row: CollRow): Record<string, unknown> {
  return expandJsonCols(row, JSON_COLS[table] ?? [])
}

export function registerCollectionRoutes(app: Hono) {
  // create usa el schema refinado (valida reglas cruzadas); patch usa el input
  // en partial (un patch de un solo campo no puede validar cruces)
  const CREATE_SCHEMAS: Record<string, z.ZodType> = {
    experiences: experienceCreateSchema,
    education: educationCreateSchema,
    skills: skillCreateSchema,
    projects: projectCreateSchema,
    assessments: assessmentInputSchema,
  }
  const PATCH_SCHEMAS: Record<string, z.ZodType> = {
    experiences: experienceInputSchema.partial(),
    education: educationInputSchema.partial(),
    skills: skillInputObjectSchema.partial(),
    projects: projectInputSchema.partial(),
    assessments: assessmentInputSchema.partial(),
  }

  for (const [coll, table] of Object.entries(COLL_TABLE)) {
    const listRepo = () => makeCrud<CollRow>(getDb(), table)

    app.get(`/api/profile/${coll}`, (c) => {
      const active = requireActiveProfile()
      return c.json(listRepo().list({ profile_id: active.id }).map((r) => toApiRow(table, r)))
    })

    app.post(`/api/profile/${coll}`, async (c) => {
      const active = requireActiveProfile()
      const body = parseBody(CREATE_SCHEMAS[coll]!, await c.req.json())
      try {
        const created = listRepo().create({ ...toDbPayload(body as Record<string, unknown>), id: crypto.randomUUID(), profile_id: active.id })
        return c.json(toApiRow(table, created as CollRow), 201)
      } catch (err) {
        mapUniqueViolation(err, 'idx_skill_unique', 'duplicate_skill', 'ya existe esa skill en la categoría')
        throw err
      }
    })

    app.patch(`/api/profile/${coll}/:id`, async (c) => {
      const active = requireActiveProfile()
      const id = c.req.param('id')
      const existing = listRepo().get(id)
      if (!existing || existing.profile_id !== active.id) {
        throw new ApiError('not_found', `${coll}/${id} inexistente para el perfil activo`, 404)
      }
      const body = parseBody(PATCH_SCHEMAS[coll]!, await c.req.json())
      const updated = listRepo().update(id, toDbPayload(body as Record<string, unknown>))
      if (!updated) throw new ApiError('not_found', `${coll}/${id} inexistente`, 404)
      return c.json(toApiRow(table, updated))
    })

    app.delete(`/api/profile/${coll}/:id`, (c) => {
      const active = requireActiveProfile()
      const id = c.req.param('id')
      const existing = listRepo().get(id)
      if (!existing || existing.profile_id !== active.id) {
        throw new ApiError('not_found', `${coll}/${id} inexistente para el perfil activo`, 404)
      }
      listRepo().remove(id)
      return c.body(null, 204)
    })
  }
}

/** arrays/listas van como TEXT json a la DB */
function toDbPayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    out[Array.isArray(v) || (v !== null && typeof v === 'object') ? `${k}_json` : k] =
      Array.isArray(v) || (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
  }
  return out
}
