import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
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
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-us3-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
  // perfil con contenido para que el snapshot tenga materia prima
  await json('POST', '/profiles', {
    name: 'Basma Dev',
    contact: { email: 'basma@dev.co', phone: '+5411000000', city: 'CABA' },
    summary: 'Perfil de prueba',
  })
  await json('POST', '/profile/experiences', {
    company: 'Acme',
    role: 'Backend',
    start_date: '2022-01',
    achievements: ['Hizo API'],
    tags: ['node'],
  })
  await json('POST', '/profile/skills', { name: 'TypeScript', category: 'technical', level: 4 })
  await json('POST', '/profile/skills', { name: 'Inglés', category: 'language', cefr: 'C1' })
  await json('POST', '/profile/education', { institution: 'UBA', degree: 'Ing.', start_date: '2015-03' })
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('US3 postings (T038)', () => {
  it('POST texto → parse IA mock → parsed_json completo', async () => {
    const r = await json('POST', '/postings', { raw_text: 'Buscamos backend con TypeScript y PostgreSQL' })
    expect(r.status).toBe(201)
    expect(r.data.status).toBe('parsed')
    expect(r.data.parsed.title).toBe('Backend Developer')
    expect(r.data.parsed.keywords).toContain('postgresql')
  })

  it('POST vacío → 400', async () => {
    const r = await json('POST', '/postings', { raw_text: '' })
    expect(r.status).toBe(400)
  })

  it('PATCH corrige parsed_json y mantiene parsed', async () => {
    const p = (await json('POST', '/postings', { raw_text: 'x' })).data
    const patched = await json('PATCH', `/postings/${p.id}`, { title: 'Título corregido' })
    expect(patched.status).toBe(200)
    expect(patched.data.parsed.title).toBe('Título corregido')
    expect(patched.data.parsed.keywords.length).toBeGreaterThan(0)
  })

  it('GET lista y DELETE borra', async () => {
    await json('POST', '/postings', { raw_text: 'a' })
    const list = (await json('GET', '/postings')).data
    expect(list).toHaveLength(1)
    const del = await json('DELETE', `/postings/${list[0].id}`)
    expect(del.status).toBe(204)
  })
})

describe('US3 generación snapshot inmutable (T039, SC-005)', () => {
  it('generate sin posting → 201 con content + data_snapshot', async () => {
    const r = await json('POST', '/cvs/generate', {})
    expect(r.status).toBe(201)
    expect(r.data.template_id).toBe('ats-classic-v1')

    const full = (await json('GET', `/cvs/${r.data.id}`)).data
    expect(full.content.header.name).toBe('Basma Dev')
    expect(full.content.sections.find((s: { type: string }) => s.type === 'experience')).toBeDefined()
    expect(full.data_snapshot.profile.name).toBe('Basma Dev')
    expect(full.data_snapshot.experiences).toHaveLength(1)
  })

  it('SC-005: dos generaciones con mismo input → content byte-idéntico', async () => {
    const a = await json('POST', '/cvs/generate', {})
    const b = await json('POST', '/cvs/generate', {})

    const fa = (await json('GET', `/cvs/${a.data.id}`)).data
    const fb = (await json('GET', `/cvs/${b.data.id}`)).data

    expect(JSON.stringify(fa.content)).toBe(JSON.stringify(fb.content))
    expect(JSON.stringify(fa.data_snapshot)).toBe(JSON.stringify(fb.data_snapshot))
  })

  it('generate con posting_id vincula; borrar posting deja posting_id NULL', async () => {
    const p = (await json('POST', '/postings', { raw_text: 'backend ts' })).data
    const cv = await json('POST', '/cvs/generate', { posting_id: p.id })
    expect(cv.data.posting_id).toBe(p.id)

    await json('DELETE', `/postings/${p.id}`)
    const after = (await json('GET', `/cvs/${cv.data.id}`)).data
    expect(after.posting_id).toBeNull()
  })

  it('posting de otro perfil → 404', async () => {
    // crear segundo perfil, activarlo y postear COMO él
    const p2 = (await json('POST', '/profiles', { name: 'Otro', contact: { phone: '+54999' } })).data
    await json('POST', `/profiles/${p2.id}/activate`)
    const p = (await json('POST', '/postings', { raw_text: 'otro' })).data

    // volver al primer perfil e intentar generar con la posting ajena
    const profiles = (await json('GET', '/profiles')).data
    const first = profiles.find((x: { id: string }) => x.id !== p2.id)
    await json('POST', `/profiles/${first.id}/activate`)

    const gen = await json('POST', '/cvs/generate', { posting_id: p.id })
    expect(gen.status).toBe(404)
  })

  it('historial GET /cvs lista snapshots', async () => {
    await json('POST', '/cvs/generate', {})
    await json('POST', '/cvs/generate', {})
    const list = (await json('GET', '/cvs')).data
    expect(list).toHaveLength(2)
    expect(list[0].created_at).toBeDefined()
  })

  it('DELETE cv manual habilitado', async () => {
    const cv = await json('POST', '/cvs/generate', {})
    expect((await json('DELETE', `/cvs/${cv.data.id}`)).status).toBe(204)
    expect(((await json('GET', '/cvs')).data)).toHaveLength(0)
  })
})

describe('US3 export 3 formatos (T041)', () => {
  let cvId: string

  beforeEach(async () => {
    const cv = await json('POST', '/cvs/generate', {})
    cvId = cv.data.id
  })

  it('export genera pdf+md+json válidos', async () => {
    const exp = await json('POST', `/cvs/${cvId}/export`)
    expect(exp.status).toBe(200)
    expect(exp.data.pdf).toMatch(/\.pdf$/)
    expect(exp.data.md).toMatch(/\.md$/)
    expect(exp.data.json).toMatch(/\.json$/)

    const pdfPath = join(tmp, exp.data.pdf)
    const mdPath = join(tmp, exp.data.md)
    const jsonPath = join(tmp, exp.data.json)

    expect(existsSync(pdfPath)).toBe(true)
    const pdfBytes = readFileSync(pdfPath)
    expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF')

    const md = readFileSync(mdPath, 'utf8')
    expect(md).toContain('# Basma Dev')
    expect(md).toContain('- Hizo API')

    // JSON Resume válido (contrato: export 100% válido contra schema oficial)
    const jr = JSON.parse(readFileSync(jsonPath, 'utf8'))
    expect(jr.basics.name).toBe('Basma Dev')
    expect(jr.work[0].position).toBe('Backend')
    expect(jr['x-tweakcv'].cv_id).toBe(cvId)
    // idiomas separados de skills según mapping
    expect(jr.languages[0].fluency).toBe('CEFR C1')
    // assessments nunca viajan
    expect(jr.assessments).toBeUndefined()
  })

  it('preview HTML fiel con headings canónicos', async () => {
    const prev = await json('GET', `/cvs/${cvId}/preview`)
    expect(prev.status).toBe(200)
    expect(prev.data.html).toContain('<h1>Basma Dev</h1>')
    expect(prev.data.html).toMatch(/Experience/)
  })

  it('re-export actualiza exports del snapshot (UPDATE permitido por contrato)', async () => {
    const e1 = await json('POST', `/cvs/${cvId}/export`)
    const e2 = await json('POST', `/cvs/${cvId}/export`)
    expect(e2.data.pdf).toBe(e1.data.pdf)

    const row = getDb().prepare('SELECT exports_json FROM generated_cv WHERE id = ?').get(cvId) as {
      exports_json: string
    }
    expect(JSON.parse(row.exports_json).md).toBeTruthy()
  })
})
