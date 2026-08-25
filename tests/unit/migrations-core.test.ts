import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { runMigrations } from '../../src/server/db/migrate'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  runMigrations(db, fileURLToPath(new URL('../../src/server/db/migrations', import.meta.url)))
})

afterEach(() => {
  db.close()
})

function createProfile(name = 'Dev', isActive = 1) {
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO profile (id, name, contact_json, is_active) VALUES (?, ?, ?, ?)').run(
    id,
    name,
    JSON.stringify({ email: 'a@b.co' }),
    isActive,
  )
  return id
}

describe('migración 0001_core', () => {
  it('crea las tablas core', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>
    expect(tables.map((r) => r.name)).toEqual(
      expect.arrayContaining(['profile', 'experience', 'education', 'skill', 'project']),
    )
  })

  it('profile: timestamps con default ISO-8601', () => {
    createProfile()
    const row = db.prepare('SELECT created_at, updated_at FROM profile').get() as {
      created_at: string
      updated_at: string
    }
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
  })

  it('profile: exactamente un activo (índice único parcial)', () => {
    const p1 = crypto.randomUUID()
    db.prepare('INSERT INTO profile (id, name, contact_json, is_active) VALUES (?, ?, ?, 1)').run(
      p1,
      'A',
      '{}',
    )
    expect(() =>
      db.prepare('INSERT INTO profile (id, name, contact_json, is_active) VALUES (?, ?, ?, 1)').run(
        crypto.randomUUID(),
        'B',
        '{}',
      ),
    ).toThrow(/UNIQUE/)
  })

  it('experience: FK a profile obligatoria', () => {
    expect(() =>
      db.prepare('INSERT INTO experience (id, profile_id, company, role, start_date, achievements_json) VALUES (?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(),
        'no-existe',
        'Acme',
        'Dev',
        '2020-01',
        JSON.stringify(['hizo cosas']),
      ),
    ).toThrow(/FOREIGN KEY/)
  })

  it('experience: end_date < start_date rechazado', () => {
    const id = createProfile()
    expect(() =>
      db.prepare('INSERT INTO experience (id, profile_id, company, role, start_date, end_date, achievements_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(),
        id,
        'Acme',
        'Dev',
        '2020-06',
        '2020-01',
        JSON.stringify(['x']),
      ),
    ).toThrow(/CHECK/)
  })

  it('experience: exige al menos un achievement', () => {
    const id = createProfile()
    expect(() =>
      db.prepare('INSERT INTO experience (id, profile_id, company, role, start_date, achievements_json) VALUES (?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(),
        id,
        'Acme',
        'Dev',
        '2020-01',
        JSON.stringify([]),
      ),
    ).toThrow(/CHECK/)
  })

  it('education: status restringido a in_progress|completed', () => {
    const id = createProfile()
    expect(() =>
      db.prepare('INSERT INTO education (id, profile_id, institution, degree, start_date, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(),
        id,
        'UBA',
        'Lic.',
        '2015-03',
        'abandonada',
      ),
    ).toThrow(/CHECK/)
  })

  it('skill: category y level válidos; cefr requerido solo si language', () => {
    const id = createProfile()
    const ins = db.prepare(
      'INSERT INTO skill (id, profile_id, name, category, level, cefr) VALUES (?, ?, ?, ?, ?, ?)',
    )
    expect(() => ins.run(crypto.randomUUID(), id, 'TS', 'devops', null, null)).toThrow(/CHECK/)
    expect(() => ins.run(crypto.randomUUID(), id, 'TS', 'technical', 9, null)).toThrow(/CHECK/)
    // language sin cefr → rechazado por CHECK condicional
    expect(() => ins.run(crypto.randomUUID(), id, 'Inglés', 'language', null, null)).toThrow(/CHECK/)
    ins.run(crypto.randomUUID(), id, 'Inglés', 'language', null, 'C1')
    expect(db.prepare('SELECT COUNT(*) n FROM skill').get()).toEqual({ n: 1 })
  })

  it('skill: unicidad (profile_id, lower(name), category)', () => {
    const id = createProfile()
    const ins = db.prepare(
      'INSERT INTO skill (id, profile_id, name, category, level) VALUES (?, ?, ?, ?, ?)',
    )
    ins.run(crypto.randomUUID(), id, 'TypeScript', 'technical', 4)
    expect(() => ins.run(crypto.randomUUID(), id, 'typescript', 'technical', 3)).toThrow(/UNIQUE/)
    // misma skill en otra categoría sí se permite
    expect(() => ins.run(crypto.randomUUID(), id, 'TypeScript', 'soft', null)).not.toThrow()
  })
})
