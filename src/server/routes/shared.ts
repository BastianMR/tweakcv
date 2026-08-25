import { z } from 'zod'
import { getDb } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'

export interface ProfileRow {
  id: string
  name: string
  contact_json: string
  summary: string | null
  is_active: 0 | 1
  created_at: string
  updated_at: string
}

/** perfil activo obligatorio para recursos scopeados */
export function requireActiveProfile(): ProfileRow {
  const active = makeCrud<ProfileRow>(getDb(), 'profile').list({ is_active: 1 })[0]
  if (!active) throw new ApiError('no_profile', 'no hay perfil activo (onboarding)', 404)
  return active
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ')
    throw new ApiError('validation_error', `payload inválido: ${fields}`, 400, z.treeifyError(parsed.error))
  }
  return parsed.data
}

export function mapUniqueViolation(err: unknown, indexName: string, code: string, message: string): void {
  const e = err as { code?: unknown; message?: unknown }
  if (
    typeof e.code === 'string' &&
    e.code.startsWith('SQLITE_CONSTRAINT_UNIQUE') &&
    typeof e.message === 'string' &&
    e.message.includes(indexName)
  ) {
    throw new ApiError(code, message, 409)
  }
}

type Json = Record<string, unknown>

function parseJsonCol(value: string | null): unknown {
  if (value === null || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** convierte columnas *_json de una fila a campos API y descarta los crudos */
export function expandJsonCols(row: Json, cols: readonly string[]): Json {
  const out: Json = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.endsWith('_json')) {
      const name = k.slice(0, -5)
      if (cols.includes(name)) out[name] = parseJsonCol(v as string)
    } else {
      out[k] = v
    }
  }
  return out
}
