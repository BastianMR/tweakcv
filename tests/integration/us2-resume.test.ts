import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
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

const VALID_RESUME = {
  basics: {
    name: 'Basma Test',
    email: 'basma@test.co',
    phone: '+54 11 1111-1111',
    summary: 'Resumen profesional',
    location: { city: 'Buenos Aires' },
  },
  work: [
    {
      name: 'Acme Corp',
      position: 'Backend Dev',
      startDate: '2022-01-01',
      endDate: '2024-06-01',
      highlights: ['API de pagos'],
    },
  ],
  education: [
    { institution: 'UBA', studyType: 'Ing. Informática', area: 'Informática', startDate: '2015-03-01', endDate: '2021-12-01' },
  ],
  skills: [{ name: 'TypeScript', level: 'Advanced' }],
  languages: [{ language: 'Inglés', level: 'C1' }],
  projects: [{ name: 'TweakCV', description: 'CV studio', highlights: ['ATS'] }],
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-resume-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
  await json('POST', '/profiles', { name: 'Dev', contact: { email: 'd@t.co' } })
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('US2 import JSON Resume (FR-017)', () => {
  it('resume.json válido → documento cv revisado con datos mapeados', async () => {
    const r = await json('POST', '/documents/import/resume', { resume: VALID_RESUME })
    expect(r.status).toBe(201)
    expect(r.data.kind).toBe('cv')
    expect(r.data.status).toBe('reviewed')

    const doc = (await json('GET', `/documents/${r.data.id}`)).data
    expect(doc.extracted.contact.email).toBe('basma@test.co')
    expect(doc.extraction_meta.model).toBe('jsonresume-import')
    // fechas normalizadas a YYYY-MM
    expect(doc.extracted.experiences[0].startDate).toBe('2022-01')
    expect(doc.extracted.education[0].endDate).toBe('2021-12')
    // idiomas van como skills category language
    const langs = doc.extracted.skills.filter((s: { category: string }) => s.category === 'language')
    expect(langs).toHaveLength(1)
    expect(langs[0].name).toBe('Inglés')
  })

  it('resume inválido → 400 validation_error sin crear documento', async () => {
    // el schema oficial no exige required: violamos con un TIPO incorrecto
    const r = await json('POST', '/documents/import/resume', {
      resume: { work: [{ startDate: 12345 }] },
    })
    expect(r.status).toBe(400)
    const list = (await json('GET', '/documents')).data
    expect(list).toHaveLength(0)
  })

  it('el documento virtual entra al mismo flujo human-in-the-loop (preview → import)', async () => {
    const created = await json('POST', '/documents/import/resume', { resume: VALID_RESUME })
    const id = created.data.id

    const preview = (await json('POST', `/documents/${id}/import/preview`)).data
    const colls = new Set(preview.ops.map((o: { coll: string }) => o.coll))
    expect(colls.has('experiences')).toBe(true)
    expect(colls.has('education')).toBe(true)
    expect(colls.has('skills')).toBe(true)

    const imp = await json('POST', `/documents/${id}/import`, { ops: preview.ops })
    expect(imp.data.imported).toBeGreaterThan(0)

    expect(((await json('GET', '/profile/experiences')).data)).toHaveLength(1)
    expect(((await json('GET', '/profile/projects')).data)).toHaveLength(1)
  })
})
