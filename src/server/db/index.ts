import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { migrationsDir, runMigrations } from './migrate'

export function dataDir(): string {
  return process.env.TWEAKCV_DATA_DIR ?? join(process.cwd(), 'data')
}

let instance: Database.Database | null = null

export function getDb(dbPath?: string): Database.Database {
  if (instance) return instance
  const path = dbPath ?? join(dataDir(), 'tweakcv.db')
  mkdirSync(dirname(path), { recursive: true })
  instance = new Database(path)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  runMigrations(instance, migrationsDir)
  return instance
}

export function closeDb(): void {
  instance?.close()
  instance = null
}
