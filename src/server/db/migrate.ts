import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type Database from 'better-sqlite3'

const MIGRATION_RE = /^(\d{4})_[A-Za-z0-9_-]+\.sql$/

export const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url))

interface MigrationFile {
  version: number
  name: string
}

export function runMigrations(db: Database.Database, dir: string): number[] {
  const current = db.pragma('user_version', { simple: true }) as number
  const files = readdirSync(dir)
    .map<MigrationFile | null>((name) => {
      const match = MIGRATION_RE.exec(name)
      return match ? { version: Number(match[1]), name } : null
    })
    .filter((entry): entry is MigrationFile => entry !== null)
    .sort((a, b) => a.version - b.version)

  for (let i = 1; i < files.length; i++) {
    const prev = files[i - 1]
    const curr = files[i]
    if (prev && curr && curr.version === prev.version) {
      throw new Error(`duplicate migration version ${curr.version} in ${dir}`)
    }
  }

  const applied: number[] = []
  for (const { version, name } of files) {
    if (version <= current) continue
    const sql = readFileSync(join(dir, name), 'utf8')
    db.transaction(() => {
      db.exec(sql)
      db.pragma(`user_version = ${version}`)
    })()
    applied.push(version)
  }
  return applied
}

