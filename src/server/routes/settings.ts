import type { Hono } from 'hono'
import { z } from 'zod'
import OpenAI from 'openai'
import { getDb } from '../db'
import { getSettings, setApiKey, settingsSchema, updateSettings } from '../settings'
import { parseBody } from './shared'

const putSchema = settingsSchema.extend({
  api_key: z.string().min(1).optional(),
})

/** heurística pragmática de soporte de visión por nombre de modelo */
const VISION_MODEL_RE =
  /gpt-4o|gpt-4\.1|vision|omni|claude-3|claude-4|gemini|llava|bakllava|pixtral|qwen.*vl|llama-3\.2|mistral-small-3|minimax/i

export function registerSettingsRoutes(app: Hono) {
  app.get('/api/settings', (c) => {
    return c.json(getSettings(getDb()))
  })

  app.put('/api/settings', async (c) => {
    const body = parseBody(putSchema, await c.req.json())
    const db = getDb()
    if (body.api_key !== undefined) {
      setApiKey(body.api_key)
      delete (body as Record<string, unknown>).api_key
    }
    return c.json(updateSettings(db, body))
  })

  app.post('/api/settings/test-connection', async (c) => {
    const s = getSettings(getDb())
    if (s.provider_preset === 'mock') {
      return c.json({ ok: true, vision_capable: true, provider: 'mock' })
    }

    const baseUrl = s.base_url ?? ''
    let ok = false
    try {
      const client = new OpenAI({
        baseURL: baseUrl || undefined,
        apiKey: 'probe',
        timeout: 4_000,
        maxRetries: 0,
      })
      await client.models.list()
      ok = true
    } catch {
      ok = false
    }

    return c.json({
      ok,
      provider: s.provider_preset,
      model: s.model ?? null,
      vision_capable: VISION_MODEL_RE.test(s.model ?? ''),
    })
  })
}
