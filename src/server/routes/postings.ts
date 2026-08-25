import type { Hono } from 'hono'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { getDb, dataDir } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'
import {
  parsedPostingSchema,
  postingPatchSchema,
  toPostingApi,
} from '../../shared/schemas/posting'
import type { PostingRow } from '../../shared/schemas/posting'
import { requireActiveProfile, parseBody } from './shared'
import { createAiClient } from '../ai/client'
import { MOCK_PARSE, parsePostingOutputSchema } from '../ai/ops/parse-posting/schema'

const repo = () => makeCrud<PostingRow>(getDb(), 'job_posting')

function owned(id: string): PostingRow {
  const active = requireActiveProfile()
  const row = repo().get(id)
  if (!row || row.profile_id !== active.id) throw new ApiError('not_found', 'postulación inexistente', 404)
  return row
}

export function registerPostingRoutes(app: Hono) {
  app.get('/api/postings', (c) => {
    const active = requireActiveProfile()
    return c.json(repo().list({ profile_id: active.id }).map(toPostingApi))
  })

  app.post('/api/postings', async (c) => {
    const active = requireActiveProfile()
    const contentType = c.req.header('content-type') ?? ''

    let source: 'text' | 'image'
    let rawText: string | null = null
    let imageRef: string | null = null
    const ai = createAiClient(getDb())

    if (contentType.includes('multipart/form-data')) {
      // imagen: pre-check visión ANTES de crear nada ni gastar tokens
      ai.assertVisionCapable()
      const form = await c.req.parseBody()
      const file = form.image
      if (!(file instanceof File)) throw new ApiError('validation_error', 'campo multipart "image" requerido', 400)
      if (file.size > 25 * 1024 * 1024) throw new ApiError('payload_too_large', 'máximo 25MB', 413)
      source = 'image'
      const id = crypto.randomUUID()
      const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'posting.png'
      const storedPath = join('uploads', `posting-${id}-${safeName}`)
      mkdirSync(join(dataDir(), 'uploads'), { recursive: true })
      writeFileSync(join(dataDir(), storedPath), Buffer.from(await file.arrayBuffer()))
      imageRef = storedPath.replaceAll('\\', '/')
      rawText = typeof form.raw_text === 'string' ? form.raw_text : null
    } else {
      const body = parseBody(z.object({ raw_text: z.string().min(1) }), await c.req.json())
      source = 'text'
      rawText = body.raw_text
    }

    const id = crypto.randomUUID()
    repo().create({
      id,
      profile_id: active.id,
      source,
      raw_text: rawText,
      ...(imageRef && { image_ref: imageRef }),
      status: 'draft',
    })

    try {
      const parsed = await ai.completeJson({
        op: 'parsePosting',
        system:
          'Sos un parser de postulaciones de trabajo. Respondé SOLO JSON válido según el schema. Keywords solo si aparecen literalmente en la fuente.',
        user: rawText ?? 'Postulación subida como imagen.',
        schema: parsePostingOutputSchema,
        mockOutput: () => MOCK_PARSE,
        ...(source === 'image' && { imageBase64: await readUploadBase64(imageRef!) }),
      })
      const clean = parseBody(parsedPostingSchema, parsed)
      repo().update(id, {
        parsed_json: JSON.stringify(clean),
        status: 'parsed',
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      // la postulación queda draft; el error es accionable (no_vision/ai_*)
      repo().update(id, { updated_at: new Date().toISOString() })
      throw err
    }

    return c.json(toPostingApi(repo().get(id)!), 201)
  })

  app.patch('/api/postings/:id', async (c) => {
    const row = owned(c.req.param('id'))
    const patch = parseBody(postingPatchSchema, await c.req.json())
    const current = row.parsed_json ? (JSON.parse(row.parsed_json) as Record<string, unknown>) : {}
    const merged = parseBody(parsedPostingSchema, { ...current, ...patch })
    const updated = repo().update(row.id, {
      parsed_json: JSON.stringify(merged),
      status: 'parsed',
      updated_at: new Date().toISOString(),
    })
    return c.json(toPostingApi(updated!))
  })

  app.delete('/api/postings/:id', (c) => {
    const row = owned(c.req.param('id'))
    repo().remove(row.id)
    return c.body(null, 204)
  })
}

import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

async function readUploadBase64(storedPath: string): Promise<string> {
  return readFile(resolvePath(dataDir(), storedPath), 'base64')
}
