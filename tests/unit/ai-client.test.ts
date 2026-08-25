import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { runMigrations } from '../../src/server/db/migrate'
import { updateSettings } from '../../src/server/settings'
import { setApiKey } from '../../src/server/settings'
import { AiError, createAiClient } from '../../src/server/ai/client'
import { z } from 'zod'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  runMigrations(db, fileURLToPath(new URL('../../src/server/db/migrations', import.meta.url)))
})

afterEach(() => {
  db.close()
  setApiKey(null)
})

const OutSchema = z.object({ answer: z.string() })

function chatResponse(content: string) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1,
      model: 'test-model',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('createAiClient', () => {
  it('preset sin configurar → not_configured', () => {
    updateSettings(db, { provider_preset: 'openai', base_url: null, model: null })
    expect(() => createAiClient(db)).toThrowError(AiError)
    try {
      createAiClient(db)
    } catch (e) {
      expect((e as AiError).code).toBe('not_configured')
    }
  })

  it('preset mock: devuelve el fixture determinista y jamás llama a la red', async () => {
    const fetchSpy = vi.fn()
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch })

    const out = await ai.completeJson({
      op: 'extractDocument',
      system: 'sys',
      user: 'usr',
      schema: OutSchema,
      mockOutput: () => ({ answer: 'fixture' }),
    })

    expect(out).toEqual({ answer: 'fixture' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('proveedor real: manda json_schema, auth con la key y valida salida', async () => {
    updateSettings(db, {
      provider_preset: 'groq',
      model: 'llama-test',
    })
    setApiKey('sk-secreto')
    const fetchSpy = vi.fn(async () =>
      chatResponse(JSON.stringify({ answer: 'hola' })),
    )
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch })

    const out = await ai.completeJson({
      op: 'extractDocument',
      system: 's',
      user: 'u',
      schema: OutSchema,
    })

    expect(out).toEqual({ answer: 'hola' })
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(String(url)).toContain('api.groq.com')
    const headers = new Headers(init.headers as HeadersInit)
    expect(headers.get('authorization')).toBe('Bearer sk-secreto')
    const body = JSON.parse(init.body as string)
    expect(body.response_format.type).toBe('json_schema')
    expect(body.model).toBe('llama-test')
  })

  it('mismatch de schema → reintenta una vez y recupera', async () => {
    updateSettings(db, { provider_preset: 'openai', model: 'gpt-x' })
    let calls = 0
    const fetchSpy = vi.fn(async () => {
      calls++
      return calls === 1 ? chatResponse('{"answer": 42}') : chatResponse('{"answer": "ok"}')
    })
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch, retryDelayMs: 0 })

    const out = await ai.completeJson({
      op: 'op',
      system: 's',
      user: 'u',
      schema: OutSchema,
    })
    expect(out).toEqual({ answer: 'ok' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('dos mismatches → AiError ai_schema', async () => {
    updateSettings(db, { provider_preset: 'openai', model: 'gpt-x' })
    const fetchSpy = vi.fn(async () => chatResponse('{"nada": 1}'))
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch, retryDelayMs: 0 })

    await expect(
      ai.completeJson({ op: 'op', system: 's', user: 'u', schema: OutSchema }),
    ).rejects.toMatchObject({ code: 'ai_schema' })
  })

  it('fallo de red dos veces → ai_unreachable con solo el host en detail', async () => {
    updateSettings(db, { provider_preset: 'groq', model: 'm' })
    setApiKey('sk-k')
    const fetchSpy = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch, retryDelayMs: 0 })

    const err = (await ai
      .completeJson({ op: 'op', system: 's', user: 'u', schema: OutSchema })
      .catch((e: unknown) => e as AiError)) as AiError

    expect(err.code).toBe('ai_unreachable')
    expect(err.status).toBe(502)
    expect(err.detail).toEqual({ host: 'api.groq.com' })
  })

  it('imagen sin visión → no_vision antes de gastar tokens', async () => {
    updateSettings(db, { provider_preset: 'openai', model: 'gpt-x' }) // vision_capable=false default
    const fetchSpy = vi.fn()
    const ai = createAiClient(db, { fetch: fetchSpy as typeof fetch })

    await expect(
      ai.completeJson({
        op: 'parsePosting',
        system: 's',
        user: 'u',
        schema: OutSchema,
        imageBase64: 'aG9sYQ==',
      }),
    ).rejects.toMatchObject({ code: 'no_vision', status: 422 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('preset mock es vision-capable (fixtures)', async () => {
    const ai = createAiClient(db)
    expect(() => ai.assertVisionCapable()).not.toThrow()
  })
})
