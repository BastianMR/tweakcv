import type { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'
import { toCvApi } from '../../shared/schemas/cv'
import type { CvRow, TailoredCv } from '../../shared/schemas/cv'
import { requireActiveProfile, parseBody } from './shared'
import { createAiClient } from '../ai/client'
import { tailorCvOutputSchema, mockTailorFromSnapshot } from '../ai/ops/tailor-cv/schema'
import { renderHtml } from '../pdf/render'
import { exportCv } from '../pdf/export'
import { evaluateMechanical } from '../ats/engine'
import { semanticEvaluationSchema, mockEvaluate } from '../ai/ops/evaluate-cv/schema'

const repo = () => makeCrud<CvRow>(getDb(), 'generated_cv')

function owned(id: string): CvRow {
  const active = requireActiveProfile()
  const row = repo().get(id)
  if (!row || row.profile_id !== active.id) throw new ApiError('not_found', 'CV inexistente', 404)
  return row
}

export function jsonExpand(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.endsWith('_json') && typeof v === 'string') {
      try {
        out[k.slice(0, -5)] = JSON.parse(v)
      } catch {
        out[k] = v
      }
    } else {
      out[k] = v
    }
  }
  return out
}

export interface ProfileSnapshot {
  profile: Record<string, unknown>
  experiences: Array<Record<string, unknown>>
  education: Array<Record<string, unknown>>
  skills: Array<Record<string, unknown>>
  projects: Array<Record<string, unknown>>
}

function activeSnapshot(): ProfileSnapshot {
  const db = getDb()
  const profile = requireActiveProfile()
  const snap = (table: string) =>
    makeCrud<{ id: string } & Record<string, unknown>>(db, table)
      .list({ profile_id: profile.id })
      .map(jsonExpand)
  return {
    profile: jsonExpand(profile as unknown as Record<string, unknown>),
    experiences: snap('experience'),
    education: snap('education'),
    skills: snap('skill'),
    projects: snap('project'),
  }
}

export function registerCvRoutes(app: Hono) {
  app.get('/api/cvs', (c) => {
    const active = requireActiveProfile()
    return c.json(repo().list({ profile_id: active.id }).map((r) => toCvApi(r)))
  })

  app.post('/api/cvs/generate', async (c) => {
    const active = requireActiveProfile()
    const body = parseBody(
      z.object({
        posting_id: z.string().uuid().nullish(),
        language: z.enum(['es', 'en']).default('es'),
        instructions: z.string().optional(),
        /** iteración: snapshot padre desde el que se regenera (US4) */
        parent_cv_id: z.string().uuid().nullish(),
      }),
      await c.req.json().catch(() => ({})),
    )

    let parentRow: CvRow | undefined
    if (body.parent_cv_id) {
      parentRow = repo().get(body.parent_cv_id)
      if (!parentRow || parentRow.profile_id !== active.id) {
        throw new ApiError('not_found', 'CV padre inexistente', 404)
      }
    }

    type PostingMinimal = { id: string; parsed_json: string | null; raw_text: string | null; profile_id: string }
    let posting: PostingMinimal | undefined
    if (body.posting_id) {
      posting = makeCrud<PostingMinimal>(
        getDb(),
        'job_posting',
      ).get(body.posting_id)
      if (!posting || posting.profile_id !== active.id) {
        throw new ApiError('not_found', 'postulación inexistente', 404)
      }
    }

    // SC-005: snapshot inmutable de las filas usadas — garantiza reproducibilidad
    const snapshot = activeSnapshot()
    const ai = createAiClient(getDb())

    const content = await ai.completeJson({
      op: 'tailorCv',
      system:
        'Sos un generador de CVs ATS. SOLO podés usar datos del profileSnapshot; reordenar/reformular OK, inventar NO. Respondé SOLO JSON válido.',
      user: JSON.stringify({
        posting: posting?.parsed_json ? JSON.parse(posting.parsed_json) : null,
        profileSnapshot: snapshot,
        language: body.language,
        instructions: body.instructions,
      }),
      schema: tailorCvOutputSchema,
      mockOutput: () => mockTailorFromSnapshot(snapshot as never, body.language),
    })

    const clean = parseBody(tailorCvOutputSchema, content) as TailoredCv
    const created = repo().create({
      id: crypto.randomUUID(),
      profile_id: active.id,
      // posting explícito > heredado del padre (iteración)
      ...((body.posting_id || parentRow?.posting_id) && {
        posting_id: body.posting_id ?? parentRow!.posting_id!,
      }),
      template_id: 'ats-classic-v1',
      content_json: JSON.stringify(clean),
      data_snapshot_json: JSON.stringify(snapshot),
      exports_json: '{}',
      language: body.language,
      ...(parentRow && { parent_cv_id: parentRow.id }),
    })

    return c.json(toCvApi(created), 201)
  })

  /** US4: mecánica determinista + semántica IA → score_json (único UPDATE permitido) */
  app.post('/api/cvs/:id/evaluate', async (c) => {
    const row = owned(c.req.param('id'))
    const body = z
      .object({ posting_id: z.string().uuid().optional() })
      .parse(await c.req.json().catch(() => ({})))

    const content = JSON.parse(row.content_json) as TailoredCv
    const html = renderHtml(content, row.language)

    let parsedPosting: Record<string, unknown> | null = null
    const postingId = body.posting_id ?? row.posting_id
    if (postingId) {
      const p = makeCrud<{ id: string; parsed_json: string | null } & { profile_id: string }>(
        getDb(),
        'job_posting',
      ).get(postingId)
      if (!p || p.profile_id !== row.profile_id) throw new ApiError('not_found', 'postulación inexistente', 404)
      parsedPosting = p.parsed_json ? (JSON.parse(p.parsed_json) as Record<string, unknown>) : null
    }

    const keywords = ((parsedPosting?.keywords ?? []) as string[]).map(String)
    const mechanical = evaluateMechanical(content, keywords, html)

    const ai = createAiClient(getDb())
    const semantic = await ai.completeJson({
      op: 'evaluateCv',
      system:
        'Sos un evaluador de CVs. Citá evidencia textual del propio CV; jamás inventes requisitos. Respondé SOLO JSON válido.',
      user: JSON.stringify({ cvContent: content, parsedPosting }),
      schema: semanticEvaluationSchema,
      mockOutput: () =>
        mockEvaluate({ cvContent: content as Record<string, unknown>, parsedPosting }),
    })
    const cleanSemantic = parseBody(semanticEvaluationSchema, semantic)
    const semanticScore = Math.round(
      cleanSemantic.rubric.reduce((sum, r) => sum + r.score, 0) / cleanSemantic.rubric.length * 10,
    )

    // ponderación interna configurable (default 60/40 — contrato)
    const WEIGHT_MECHANICAL = Number(process.env.TWEAKCV_ATS_WEIGHT ?? 0.6)
    const total = Math.round(WEIGHT_MECHANICAL * mechanical.mechanicalScore + (1 - WEIGHT_MECHANICAL) * semanticScore)

    repo().update(row.id, {
      score_json: JSON.stringify({
        mechanical: { checks: mechanical.checks, score: mechanical.mechanicalScore },
        semantic: { rubric: cleanSemantic.rubric, score: semanticScore },
        topSuggestions: cleanSemantic.topSuggestions,
        total,
        evaluated_at: new Date().toISOString(),
      }),
    })

    return c.json({
      total,
      mechanical: { score: mechanical.mechanicalScore, checks: mechanical.checks },
      semantic: { score: semanticScore, rubric: cleanSemantic.rubric },
      topSuggestions: cleanSemantic.topSuggestions,
    })
  })

  app.get('/api/cvs/:id', (c) => c.json(toCvApi(owned(c.req.param('id')), { full: true })))

  // preview fiel en HTML para iframe del Studio
  app.get('/api/cvs/:id/preview', (c) => {
    const row = owned(c.req.param('id'))
    const content = JSON.parse(row.content_json) as TailoredCv
    return c.json({ html: renderHtml(content, row.language) })
  })

  app.post('/api/cvs/:id/export', async (c) => {
    const row = owned(c.req.param('id'))
    const exports = await exportCv(row.id)
    return c.json(exports)
  })

  app.delete('/api/cvs/:id', (c) => {
    const row = owned(c.req.param('id'))
    repo().remove(row.id)
    return c.body(null, 204)
  })
}
