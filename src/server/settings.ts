import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { dataDir } from './db'
import { ApiError } from './errors'

export const PROVIDER_PRESETS = [
  'openai',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'custom',
  'mock',
] as const

export const settingsSchema = z.object({
  provider_preset: z.enum(PROVIDER_PRESETS).optional(),
  base_url: z.string().url().nullable().optional(),
  model: z.string().min(1).nullable().optional(),
  vision_capable: z.boolean().optional(),
  ui_language: z.enum(['es', 'en']).optional(),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
})

export type Settings = z.infer<typeof settingsSchema> & {
  provider_preset: (typeof PROVIDER_PRESETS)[number]
  base_url: string | null
  model: string | null
  vision_capable: boolean
  ui_language: 'es' | 'en'
  log_level: 'debug' | 'info' | 'warn' | 'error'
}

interface SettingRow {
  id: number
  provider_preset: string
  base_url: string | null
  model: string | null
  vision_capable: 0 | 1
  ui_language: string
  log_level: string
}

function toSettings(row: SettingRow): Settings {
  return {
    provider_preset: row.provider_preset as Settings['provider_preset'],
    base_url: row.base_url,
    model: row.model,
    vision_capable: row.vision_capable === 1,
    ui_language: row.ui_language as Settings['ui_language'],
    log_level: row.log_level as Settings['log_level'],
  }
}

export function getSettings(db: Database.Database): Settings {
  const row = db.prepare('SELECT * FROM setting WHERE id = 1').get() as SettingRow | undefined
  if (!row) throw new ApiError('internal', 'settings row missing', 500)
  return toSettings(row)
}

export function updateSettings(
  db: Database.Database,
  patch: Partial<Settings>,
): Settings {
  const parsed = settingsSchema.safeParse(patch)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ')
    throw new ApiError('validation_error', `settings inválidos: ${fields}`, 400, z.treeifyError(parsed.error))
  }
  const allowed = Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  if (allowed.length > 0) {
    const sets = allowed.map(([k]) => `${k} = ?`)
    const values = allowed.map(([k, v]) =>
      k === 'vision_capable' ? (v ? 1 : 0) : v,
    )
    db.prepare(
      `UPDATE setting SET ${sets.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`,
    ).run(...values)
  }
  return getSettings(db)
}

const credentialsPath = () => join(dataDir(), 'credentials.json')

export function getApiKey(): string | null {
  try {
    const raw = JSON.parse(readFileSync(credentialsPath(), 'utf8')) as { api_key?: unknown }
    return typeof raw.api_key === 'string' && raw.api_key.length > 0 ? raw.api_key : null
  } catch {
    return null
  }
}

export function setApiKey(apiKey: string | null): void {
  const path = credentialsPath()
  if (!apiKey) {
    rmSync(path, { force: true })
    return
  }
  writeFileSync(path, `${JSON.stringify({ api_key: apiKey })}\n`, 'utf8')
}
