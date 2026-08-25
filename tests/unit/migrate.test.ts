import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runMigrations } from '../../src/server/db/migrate'

let dir: string

function writeMigration(name: string, sql: string) {
  writeFileSync(join(dir, name), sql)
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tweakcv-migrate-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('runMigrations', () => {
  it('aplica migraciones pendientes en orden y setea user_version', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE a (id INTEGER);')
    writeMigration('0002_second.sql', 'CREATE TABLE b (id INTEGER);')
    const db = new Database(':memory:')

    const applied = runMigrations(db, dir)

    expect(applied).toEqual([1, 2])
    expect(db.pragma('user_version', { simple: true })).toBe(2)
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('a','b') ORDER BY name").all(),
    ).toEqual([{ name: 'a' }, { name: 'b' }])
  })

  it('es idempotente: una segunda corrida no aplica nada', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE a (id INTEGER);')
    const db = new Database(':memory:')
    runMigrations(db, dir)

    const applied = runMigrations(db, dir)

    expect(applied).toEqual([])
    expect(db.pragma('user_version', { simple: true })).toBe(1)
  })

  it('aplica solo las faltantes cuando la versión ya avanzó', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE a (id INTEGER);')
    writeMigration('0002_second.sql', 'CREATE TABLE b (id INTEGER);')
    const db = new Database(':memory:')
    runMigrations(db, dir)
    writeMigration('0003_third.sql', 'CREATE TABLE c (id INTEGER);')

    const applied = runMigrations(db, dir)

    expect(applied).toEqual([3])
    expect(db.pragma('user_version', { simple: true })).toBe(3)
  })

  it('hace rollback completo si una migración falla (versión intacta)', () => {
    writeMigration('0001_ok.sql', 'CREATE TABLE a (id INTEGER);')
    writeMigration('0002_broken.sql', 'CREATE TABLE b (id INTEGER); SELECT * FROM missing_table;')
    const db = new Database(':memory:')

    expect(() => runMigrations(db, dir)).toThrow()
    // la migración previa quedó aplicada; la fallida hizo rollback total
    expect(db.pragma('user_version', { simple: true })).toBe(1)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='a'").get()).toBeDefined()
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='b'").get()).toBeUndefined()
  })

  it('rechaza dos archivos con el mismo número de versión', () => {
    writeMigration('0001_a.sql', 'SELECT 1;')
    writeMigration('0001_b.sql', 'SELECT 2;')
    const db = new Database(':memory:')

    expect(() => runMigrations(db, dir)).toThrow(/duplicate|duplicad/i)
  })

  it('ignora archivos que no siguen el patrón NNNN_nombre.sql', () => {
    writeMigration('README.md', 'notas')
    writeMigration('0001_real.sql', 'CREATE TABLE a (id INTEGER);')
    const db = new Database(':memory:')

    expect(runMigrations(db, dir)).toEqual([1])
  })
})
