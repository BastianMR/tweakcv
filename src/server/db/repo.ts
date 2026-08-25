import type Database from 'better-sqlite3'

type WithId = { id: string }

export interface Crud<T extends WithId> {
  list(where?: Partial<T>): T[]
  get(id: string): T | undefined
  create(data: Partial<T> & WithId): T
  update(id: string, patch: Partial<T>): T | undefined
  remove(id: string): boolean
}

interface Column {
  name: string
}

export function makeCrud<T extends WithId>(db: Database.Database, table: string): Crud<T> {
  const columns = (db.pragma(`table_info(${table})`) as Column[]).map((c) => c.name)
  const hasUpdatedAt = columns.includes('updated_at')
  const select = `SELECT * FROM ${table}`

  // Los schemas zod validan antes; acá solo filtramos claves que no son columnas.
  function knownOnly(record: Record<string, unknown>): string[] {
    return Object.keys(record).filter((k) => columns.includes(k))
  }

  return {
    list(where) {
      const keys = where ? knownOnly(where as Record<string, unknown>) : []
      if (keys.length === 0) {
        return db.prepare(`${select} ORDER BY created_at`).all() as T[]
      }
      const clauses = keys.map((k) => `${k} = ?`).join(' AND ')
      const values = keys.map((k) => (where as Record<string, unknown>)[k])
      return db.prepare(`${select} WHERE ${clauses} ORDER BY created_at`).all(...values) as T[]
    },
    get(id) {
      return db.prepare(`${select} WHERE id = ?`).get(id) as T | undefined
    },
    create(data) {
      const rec = data as Record<string, unknown>
      const keys = knownOnly(rec).filter((k) => rec[k] !== undefined)
      const placeholders = keys.map(() => '?').join(', ')
      db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(
        ...keys.map((k) => rec[k]),
      )
      return this.get((data as T).id) as T
    },
    update(id, patch) {
      const rec = patch as Record<string, unknown>
      const keys = knownOnly(rec).filter((k) => rec[k] !== undefined)
      if (keys.length === 0 && !hasUpdatedAt) return this.get(id)
      const sets = keys.map((k) => `${k} = ?`)
      const values = keys.map((k) => rec[k])
      if (hasUpdatedAt) sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
      const res = db
        .prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`)
        .run(...values, id)
      if (res.changes === 0) return undefined
      return this.get(id)
    },
    remove(id) {
      return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0
    },
  }
}
