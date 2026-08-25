import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Hono } from 'hono'
import { closeDb, getDb } from '../../src/server/db'

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
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-us4-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
  const created = await json('POST', '/profiles', {
    name: 'Basma Dev',
    contact: { email: 'b@d.co', phone: '+54112233' },
    summary: 'Backend con TypeScript y PostgreSQL',
  })
  if (created.status !== 201) {
    throw new Error(`setup profile falló: ${created.status} ${JSON.stringify(created.data)}`)
  }
  await json('POST', '/profile/experiences', {
    company: 'Acme',
    role: 'Backend Dev',
    start_date: '2022-01',
    achievements: ['API REST con Node.js', 'Migró a TypeScript'],
  })
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

async function createCvWithPosting() {
  const dump = (tag: string) =>
    appendFileSync(
      join(tmp, 'dbg.log'),
      `${tag}: ` +
        JSON.stringify({
          dataDir: process.env.TWEAKCV_DATA_DIR,
          profiles: getDb().prepare('SELECT id, name, is_active FROM profile').all(),
        }),
    )
  dump('antes-posting')
  const p = await json('POST', '/postings', {
    raw_text: 'Buscamos dev con typescript, node.js y postgresql. Deseable docker.',
  })
  dump(`despues-posting(${p.status})`)
  const g = await json('POST', '/cvs/generate', {
    posting_id: (p.data as { id?: string })?.id,
  })
  if (g.status !== 201) {
    dump(`generate-${g.status}`)
    throw new Error(
      `generate falló: ${g.status} ${JSON.stringify(g.data)} | ver ${join(tmp, 'dbg.log')}`,
    )
  }
  return { posting: p.data as { id: string }, cv: g.data as { id: string; posting_id: string | null } }
}

describe('US4 evaluación (T046)', () => {
  it('evaluate combina mecánica+semántica → score_json persistido (60/40 default)', async () => {
    const { cv } = await createCvWithPosting()

    const r = await json('POST', `/cvs/${cv.id}/evaluate`, {})
    expect(r.status).toBe(200)
    expect(r.data.mechanical.score).toBeGreaterThan(0)
    expect(r.data.semantic.rubric.length).toBeGreaterThanOrEqual(3)
    for (const item of r.data.semantic.rubric) {
      expect(item.evidence).toBeTruthy()
      expect(item.score).toBeLessThanOrEqual(10)
    }

    // total = round(0.6*mech + 0.4*sem)
    const expected = Math.round(0.6 * r.data.mechanical.score + 0.4 * r.data.semantic.score)
    expect(r.data.total).toBe(expected)
    expect(r.data.topSuggestions).toBeDefined()

    // persistido en la fila
    const row = getDb().prepare('SELECT score_json FROM generated_cv WHERE id = ?').get(cv.id) as {
      score_json: string
    }
    const stored = JSON.parse(row.score_json)
    expect(stored.total).toBe(r.data.total)
    expect(stored.mechanical.checks).toHaveLength(5)

    // cobertura keywords con evidencia textual
    const kwCheck = r.data.mechanical.checks.find((c: { id: string }) => c.id === 'keywords')
    expect(kwCheck.evidence.join(' ')).toMatch(/typescript.*present|present.*typescript/s)
  })

  it('re-evaluación actualiza SOLO score_json; content inmutable (contrato)', async () => {
    const { cv } = await createCvWithPosting()
    const before = (await json('GET', `/cvs/${cv.id}`)).data
    expect(before.score).toBeNull()

    const first = await json('POST', `/cvs/${cv.id}/evaluate`, {})
    await json('POST', `/cvs/${cv.id}/evaluate`, {})
    const after = (await json('GET', `/cvs/${cv.id}`)).data

    expect(JSON.stringify(after.content)).toBe(JSON.stringify(before.content))
    expect(after.score.total).toBe(first.data!.total) // mock determinista
    expect(after.created_at).toBe(before.created_at)
  })

  it('CV general sin posting: keyword check na, igual evalúa', async () => {
    const cv = (await json('POST', '/cvs/generate', {})).data
    const r = await json('POST', `/cvs/${cv.id}/evaluate`, {})
    expect(r.status).toBe(200)
    const kw = r.data.mechanical.checks.find((c: { id: string }) => c.id === 'keywords')
    expect(kw.detail).toContain('sin posting')
  })
})

describe('US4 iteración (T048)', () => {
  it('generate con parent_cv_id crea hijo vinculado heredando posting', async () => {
    const { cv } = await createCvWithPosting()
    await json('POST', `/cvs/${cv.id}/evaluate`, {})

    const child = await json('POST', '/cvs/generate', { parent_cv_id: (cv as { id: string }).id })
    expect(child.status).toBe(201)
    expect(child.data.parent_cv_id).toBe(cv.id)
    // hereda posting del padre
    expect(child.data.posting_id).toBe(cv.posting_id)

    // hijo independiente: el padre no mutó
    const parentAfter = (await json('GET', `/cvs/${cv.id}`)).data
    expect(parentAfter.content).toBeDefined()
  })

  it('parent de otro perfil → 404', async () => {
    const { cv } = await createCvWithPosting()
    const p2 = (await json('POST', '/profiles', { name: 'Otro', contact: { phone: '+549911' } })).data
    await json('POST', `/profiles/${p2.id}/activate`)

    const r = await json('POST', '/cvs/generate', { parent_cv_id: cv.id })
    expect(r.status).toBe(404)
  })

  it('evaluación del hijo permite comparar scores padre/hijo', async () => {
    const { cv } = await createCvWithPosting()
    const parentEval = await json('POST', `/cvs/${cv.id}/evaluate`, {})

    const child = (await json('POST', '/cvs/generate', { parent_cv_id: cv.id })).data
    const childEval = await json('POST', `/cvs/${child.id}/evaluate`, {})

    expect(parentEval.data.total).toBe(childEval.data.total) // mock: mismo snapshot → mismo score
    expect(childEval.data.total).toBeGreaterThanOrEqual(0)
    expect(childEval.data.total).toBeLessThanOrEqual(100)
  })
})
