import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Hono } from 'hono'
import { closeDb } from '../../src/server/db'

let tmp: string
let app: Hono

async function json(method: string, path: string, body?: unknown) {
  const res = await app.request(`/api${path}`, {
    method,
    ...(body !== undefined && {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data }
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-settingsapi-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('T051 settings API', () => {
  it('GET devuelve settings sin api_key jamás', async () => {
    await json('PUT', '/settings', { api_key: 'sk-muy-secreta' })
    const r = await json('GET', '/settings')
    expect(r.status).toBe(200)
    const s = r.data as Record<string, unknown>
    expect(Object.keys(s)).not.toContain('api_key')
    expect(JSON.stringify(s)).not.toContain('sk-muy-secreta')
  })

  it('PUT actualiza campos y escribe la key SOLO en credentials.json', async () => {
    const r = await json('PUT', '/settings', {
      provider_preset: 'groq',
      model: 'llama-3',
      ui_language: 'en',
      api_key: 'sk-guardada',
    })
    expect(r.status).toBe(200)
    expect(r.data.provider_preset).toBe('groq')

    const credPath = join(tmp, 'credentials.json')
    expect(existsSync(credPath)).toBe(true)
    expect(JSON.parse(readFileSync(credPath, 'utf8'))).toEqual({ api_key: 'sk-guardada' })

    // DB no contiene la key
    const dbRaw = readFileSync(join(tmp, 'tweakcv.db'))
    expect(dbRaw.toString('latin1')).not.toContain('sk-guardada')
  })

  it('preset inválido → 400', async () => {
    const r = await json('PUT', '/settings', { provider_preset: 'chatgpt' })
    expect(r.status).toBe(400)
  })

  it('test-connection con mock → ok y vision capable', async () => {
    const r = await json('POST', '/settings/test-connection')
    expect(r.status).toBe(200)
    expect(r.data).toEqual({ ok: true, vision_capable: true, provider: 'mock' })
  })

  it('test-connection con host inaccesible → ok:false sin lanzar 500', async () => {
    await json('PUT', '/settings', {
      provider_preset: 'custom',
      base_url: 'http://localhost:9', // puerto cerrado
      model: 'x',
      api_key: 'sk-k',
    })
    const r = await json('POST', '/settings/test-connection')
    expect(r.status).toBe(200)
    expect(r.data.ok).toBe(false)
  })

  it('vision_capable se detecta por heurística del nombre de modelo', async () => {
    await json('PUT', '/settings', { provider_preset: 'openai', base_url: null, model: 'gpt-4o-mini' })
    // host inalcanzable → ok:false PERO vision_capable por nombre
    const r = await json('POST', '/settings/test-connection')
    expect(r.data.vision_capable).toBe(true)
  })
})
