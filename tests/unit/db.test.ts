import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getDb, closeDb } from '../../src/server/db'
import { migrationsDir, runMigrations } from '../../src/server/db/migrate'
import { makeCrud } from '../../src/server/db/repo'

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-db-'))
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('getDb', () => {
  it('devuelve la misma instancia (singleton)', () => {
    const a = getDb(join(tmp, 'db.sqlite'))
    const b = getDb(join(tmp, 'otra.sqlite'))
    expect(b).toBe(a)
  })

  it('abre en WAL con FKs activas y migraciones aplicadas', () => {
    const db = getDb(join(tmp, 'sub', 'dir', 'db.sqlite'))
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.pragma('user_version', { simple: true })).toBeGreaterThan(0)
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profile'").get(),
    ).toBeDefined()
  })
})

describe('makeCrud', () => {
  interface SkillRow {
    id: string
    profile_id: string
    name: string
    category: 'technical' | 'soft' | 'language'
    level: number | null
    cefr: string | null
    updated_at: string
  }

  let db: Database.Database
  let skills: ReturnType<typeof makeCrud<SkillRow>>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    runMigrations(db, migrationsDir)
    db.exec("INSERT INTO profile (id, name, contact_json) VALUES ('p1', 'Dev', '{}')")
    skills = makeCrud<SkillRow>(db, 'skill')
  })

  it('create + get roundtrip', () => {
    const row = {
      id: crypto.randomUUID(),
      profile_id: 'p1',
      name: 'TypeScript',
      category: 'technical' as const,
      level: 4,
      cefr: null,
    }
    skills.create(row)
    expect(skills.get(row.id)).toMatchObject({ name: 'TypeScript', level: 4 })
  })

  it('list filtra por columna conocida', () => {
    skills.create({
      id: crypto.randomUUID(),
      profile_id: 'p1',
      name: 'A',
      category: 'technical',
      level: 1,
      cefr: null,
    })
    skills.create({
      id: crypto.randomUUID(),
      profile_id: 'p1',
      name: 'B',
      category: 'soft',
      level: null,
      cefr: null,
    })
    const langs = skills.list({ category: 'technical' })
    expect(langs).toHaveLength(1)
    expect(langs[0]?.name).toBe('A')
  })

  it('update aplica patch, toca updated_at e ignora claves desconocidas', () => {
    const id = crypto.randomUUID()
    skills.create({ id, profile_id: 'p1', name: 'A', category: 'technical', level: 1, cefr: null })
    const before = skills.get(id)!.updated_at

    const updated = skills.update(id, {
      name: 'A2',
      evil_column: 'x',
    } as unknown as Partial<SkillRow>)

    expect(updated!.name).toBe('A2')
    expect(updated!.level).toBe(1)
    expect('evil_column' in (updated as object)).toBe(false)
    expect(updated!.updated_at >= before).toBe(true)
  })

  it('remove devuelve true si borró, false si no existía', () => {
    const id = crypto.randomUUID()
    skills.create({ id, profile_id: 'p1', name: 'A', category: 'technical', level: 1, cefr: null })
    expect(skills.remove(id)).toBe(true)
    expect(skills.remove(id)).toBe(false)
    expect(skills.get(id)).toBeUndefined()
  })
})
