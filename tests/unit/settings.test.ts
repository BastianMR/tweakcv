import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getApiKey,
  getSettings,
  setApiKey,
  updateSettings,
} from '../../src/server/settings'
import { fileURLToPath } from 'node:url'
import { runMigrations } from '../../src/server/db/migrate'

let db: Database.Database
let tmp: string

beforeEach(() => {
  db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  runMigrations(db, fileURLToPath(new URL('../../src/server/db/migrations', import.meta.url)))
})

afterEach(() => {
  db.close()
})

describe('settings store', () => {
  it('la migración inserta defaults razonables', () => {
    const s = getSettings(db)
    expect(s.provider_preset).toBe('mock')
    expect(s.ui_language).toBe('es')
    expect(s.log_level).toBe('info')
    expect(s.vision_capable).toBe(false)
  })

  it('getSettings jamás devuelve api_key', () => {
    const s = getSettings(db) as Record<string, unknown>
    expect(Object.keys(s)).not.toContain('api_key')
    expect(JSON.stringify(s)).not.toMatch(/sk-/i)
  })

  it('updateSettings hace merge y persiste', () => {
    updateSettings(db, { ui_language: 'en', model: 'gpt-test' })
    const s = getSettings(db)
    expect(s.ui_language).toBe('en')
    expect(s.model).toBe('gpt-test')
    expect(s.provider_preset).toBe('mock') // no tocado
  })

  it('updateSettings rechaza valores inválidos con validation_error', () => {
    expect(() =>
      updateSettings(db, { provider_preset: 'chatgpt' as never }),
    ).toThrowError(/provider_preset/)
  })
})

describe('credentials.json', () => {
  let originalDataDir: string | undefined

  beforeEach(() => {
    originalDataDir = process.env.TWEAKCV_DATA_DIR
    tmp = mkdtempSync(join(tmpdir(), 'tweakcv-settings-'))
    process.env.TWEAKCV_DATA_DIR = tmp
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
    if (originalDataDir === undefined) delete process.env.TWEAKCV_DATA_DIR
    else process.env.TWEAKCV_DATA_DIR = originalDataDir
  })

  it('setApiKey guarda en credentials.json gitignored y getApiKey lo lee', () => {
    expect(getApiKey()).toBeNull()

    setApiKey('sk-test-123')

    const credPath = join(tmp, 'credentials.json')
    expect(existsSync(credPath)).toBe(true)
    expect(JSON.parse(readFileSync(credPath, 'utf8'))).toEqual({ api_key: 'sk-test-123' })
    expect(getApiKey()).toBe('sk-test-123')

    setApiKey(null)
    expect(getApiKey()).toBeNull()
    expect(existsSync(credPath)).toBe(false)
  })
})
