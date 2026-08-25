import type { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import { getDb, dataDir } from '../db'
import { getSettings } from '../settings'
import { logFilePath, redactSecrets } from '../log'

const APP_VERSION = '0.1.0' // package.json version en tiempo de release

/** T050 (FR-025): soporte local sin telemetría */
export function registerSystemRoutes(app: Hono) {
  app.get('/api/system/logs/tail', (c) => {
    const n = Math.min(Number(c.req.query('n') ?? 50) || 50, 500)
    let raw = ''
    try {
      raw = readFileSync(logFilePath(), 'utf8')
    } catch {
      return c.json({ lines: [] })
    }
    const all = raw.trimEnd().split('\n')
    const lines = all.slice(-n).map((l) => {
      try {
        return JSON.stringify(redactSecrets(JSON.parse(l)))
      } catch {
        // línea no-JSON: redactar por patrón igualmente
        return String(redactSecrets(l))
      }
    })
    return c.json({ lines })
  })

  app.get('/api/system/diagnostics', (c) => {
    let recentErrors: string[] = []
    try {
      const raw = readFileSync(logFilePath(), 'utf8').trimEnd().split('\n')
      recentErrors = raw
        .slice(-200)
        .filter((l) => l.includes('"level":"error"'))
        .slice(-5)
        .map((l) => {
          try {
            const o = JSON.parse(l) as Record<string, unknown>
            return `${o.time} ${o.msg} ${o.err_message ?? ''}`.trim()
          } catch {
            return l.slice(0, 200)
          }
        })
    } catch {
      /* sin log aún */
    }

    void getDb // db abierta implícitamente para validar entorno
    const settings = getSettings(getDb())
    const report = {
      version: APP_VERSION,
      os: `${process.platform} ${process.arch}`,
      node: process.version,
      uptime_s: Math.round(process.uptime()),
      data_dir: dataDir(),
      settings,
      recent_errors: recentErrors,
      generated_at: new Date().toISOString(),
    }
    // defensa extra: nada con forma de key sale de acá
    return c.json(redactSecrets(report) as typeof report)
  })
}
