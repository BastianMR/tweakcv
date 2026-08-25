import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Hono } from 'hono'
import { closeDb } from '../../src/server/db'

let tmp: string
let app: Hono

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-sys-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

async function json(method: string, path: string) {
  const res = await app.request(`/api${path}`, { method })
  return { status: res.status, data: await res.json().catch(() => null) }
}

describe('T050 diagnósticos (FR-025)', () => {
  it('logs/tail devuelve últimas líneas sin api_key', async () => {
    // generar actividad de log vía un error manejado
    const mod = await import('../../src/server/log')
    mod.getLogger().info('linea-info-ok')
    mod.getLogger().error('fallo con api_key=sk-supersecreto-123')

    const r = await json('GET', '/system/logs/tail?n=10')
    expect(r.status).toBe(200)
    const lines = r.data.lines as string[]
    expect(lines.length).toBeGreaterThanOrEqual(2)
    const joined = lines.join('\n')
    expect(joined).toContain('linea-info-ok')
    expect(joined).not.toContain('sk-supersecreto-123')
  })

  it('diagnostics arma reporte con versión/OS/settings SIN key', async () => {
    // setear una key primero: jamás debe aparecer en el reporte
    const { setApiKey } = await import('../../src/server/settings')
    setApiKey('sk-diagnostico-secreta')

    const r = await json('GET', '/system/diagnostics')
    expect(r.status).toBe(200)
    const text = JSON.stringify(r.data)
    expect(r.data.version).toBeTruthy()
    expect(r.data.os).toBeTruthy()
    expect(r.data.node).toMatch(/^v\d+/)
    expect(text).not.toContain('sk-diagnostico-secreta')
    // settings embebidos sin key
    expect(r.data.settings.provider_preset).toBe('mock')
  })
})
