import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Hono } from 'hono'
import { closeDb, getDb } from '../../src/server/db'
import { runExtraction } from '../../src/server/documents/extraction'

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

async function upload(fileName: string, content: string, kind?: string) {
  const form = new FormData()
  form.set('file', new File([content], fileName, { type: 'text/plain' }))
  if (kind) form.set('kind', kind)
  const res = await app.request('/api/documents', { method: 'POST', body: form })
  return { status: res.status, data: (await res.json()) as Record<string, unknown> }
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-us2-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
  await json('POST', '/profiles', { name: 'Dev', contact: { email: 'd@t.co' } })
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('US2 upload + extracción mock (FR-005/FR-023)', () => {
  it('upload diploma → pending → extracción async → done con datos', async () => {
    const up = await upload('diploma-uba.txt', 'contenido del diploma', 'diploma')
    expect(up.status).toBe(201)
    expect(up.data.status).toBe('pending')
    expect((up.data.extraction_meta as Record<string, unknown>).state).toBe('queued')

    // la extracción fire-and-forget eventualmente corre; esperamos estado final
    let meta: Record<string, unknown> = {}
    for (let i = 0; i < 50; i++) {
      const doc = (await json('GET', `/documents/${up.data.id}`)).data
      meta = doc.extraction_meta as Record<string, unknown>
      if (meta.state === 'done' || meta.state === 'error') break
      await new Promise((r) => setTimeout(r, 100))
    }
    expect(meta.state).toBe('done')
    const extracted = (await json('GET', `/documents/${up.data.id}`)).data.extracted as Record<string, unknown>
    expect(extracted.kind).toBe('diploma')
    expect(extracted.institution).toBe('Universidad de Buenos Aires')
  })

  it('upload mayor a 25MB → 413 payload_too_large', async () => {
    const big = new File([new ArrayBuffer(25 * 1024 * 1024 + 1)], 'huge.txt')
    const form = new FormData()
    form.set('file', big)
    const res = await app.request('/api/documents', { method: 'POST', body: form })
    expect(res.status).toBe(413)
  })

  it('kind inferido por nombre de archivo (cv)', async () => {
    const up = await upload('mi-cv-2026.txt', 'cv content')
    expect(up.data.kind).toBe('cv')
  })

  it('PATCH extracted_json → status reviewed', async () => {
    const up = await upload('diploma-x.txt', 'x', 'diploma')
    const id = up.data.id as string
    await runExtraction(id)

    const edited = await json('PATCH', `/documents/${id}`, {
      description: 'mi diploma',
      extracted_json: { kind: 'diploma', institution: 'UBA Corregida', title: 'Ing.', confidence: 1 },
    })
    expect(edited.status).toBe(200)
    expect(edited.data.status).toBe('reviewed')
    expect(edited.data.description).toBe('mi diploma')
  })

  it('reextract vuelve a pending y preserva historial en meta', async () => {
    const up = await upload('certificado.txt', 'c', 'certificate')
    const id = up.data.id as string
    await runExtraction(id)

    const re = await json('POST', `/documents/${id}/reextract`)
    expect(re.status).toBe(200)
    expect(re.data.status).toBe('pending')

    await runExtraction(id)
    const after = (await json('GET', `/documents/${id}`)).data
    expect(after.extracted.title).toBe('Cloud Practitioner')
    const meta = after.extraction_meta as { history?: unknown[] }
    expect(meta.history?.length).toBeGreaterThanOrEqual(1)
  })
})

describe('US2 import human-in-the-loop (FR-006)', () => {
  async function uploadedDiploma() {
    const up = await upload('diploma-final.txt', 'd', 'diploma')
    const id = up.data.id as string
    await runExtraction(id)
    return id
  }

  it('preview propone create; nada se escribe sin approve', async () => {
    const id = await uploadedDiploma()

    const preview = await json('POST', `/documents/${id}/import/preview`)
    expect(preview.status).toBe(200)
    expect(preview.data.ops).toHaveLength(1)
    const op = preview.data.ops[0]!
    expect(op!.action).toBe('create')
    expect(op.coll).toBe('education')
    expect(op.fields.institution.new).toBe('Universidad de Buenos Aires')

    // FR-006 duro: preview NO escribe
    expect(((await json('GET', '/profile/education')).data)).toHaveLength(0)
  })

  it('import aplica tx → education creada + imported_entity registrada', async () => {
    const id = await uploadedDiploma()
    const { ops } = (await json('POST', `/documents/${id}/import/preview`)).data

    const imp = await json('POST', `/documents/${id}/import`, { ops })
    expect(imp.status).toBe(200)
    expect(imp.data.imported).toBe(ops.length)

    const edu = (await json('GET', '/profile/education')).data
    expect(edu).toHaveLength(1)
    expect(edu[0].institution).toBe('Universidad de Buenos Aires')

    const doc = (await json('GET', `/documents/${id}`)).data
    expect(doc.status).toBe('imported')

    const links = getDb().prepare('SELECT * FROM imported_entity').all() as Array<Record<string, unknown>>
    expect(links).toHaveLength(1)
    expect(links[0]!.target_table).toBe('education')
  })

  it('re-import del mismo documento propone update con diff por campo (no duplica)', async () => {
    const id = await uploadedDiploma()
    const { ops } = (await json('POST', `/documents/${id}/import/preview`)).data
    await json('POST', `/documents/${id}/import`, { ops })

    // usuario corrige el título extraído y re-importa
    await json('PATCH', `/documents/${id}`, {
      extracted_json: { kind: 'diploma', institution: 'UBA', title: 'Título corregido', confidence: 1 },
    })

    const preview2 = (await json('POST', `/documents/${id}/import/preview`)).data
    expect(preview2.ops).toHaveLength(1)
    expect(preview2.ops[0]!.action).toBe('update')
    expect(preview2.ops[0]!.fields.degree).toEqual({ old: 'Ingeniería en Informática', new: 'Título corregido' })

    await json('POST', `/documents/${id}/import`, { ops: preview2.ops })
    const edu = (await json('GET', '/profile/education')).data
    expect(edu).toHaveLength(1) // no duplicó
    expect(edu[0].degree).toBe('Título corregido')
  })

  it('DELETE documento importado: entidades quedan, trazabilidad orphaned (FR-010)', async () => {
    const id = await uploadedDiploma()
    const { ops } = (await json('POST', `/documents/${id}/import/preview`)).data
    await json('POST', `/documents/${id}/import`, { ops })

    const del = await json('DELETE', `/documents/${id}`)
    expect(del.status).toBe(204)

    // la entidad importada sobrevive
    expect(((await json('GET', '/profile/education')).data)).toHaveLength(1)
    const links = getDb().prepare('SELECT * FROM imported_entity').all() as Array<{
      document_id: string | null
      orphaned: number
    }>
    expect(links).toHaveLength(1)
    expect(links[0]!.document_id).toBeNull()
    expect(links[0]!.orphaned).toBe(1)
  })

  it('assessment_result importa a assessments con unicidad por (perfil,type,taken_on)', async () => {
    const up = await upload('mbti.txt', 'resultado mbti', 'assessment_result')
    const id = up.data.id as string
    await runExtraction(id)

    const { ops } = (await json('POST', `/documents/${id}/import/preview`)).data
    expect(ops[0].coll).toBe('assessments')

    await json('POST', `/documents/${id}/import`, { ops })
    const list = (await json('GET', '/profile/assessments')).data
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe('mbti')
    expect(list[0].results.code).toBe('INTJ')
  })

  it('CV extraído propón creates en múltiples colecciones', async () => {
    const up = await upload('cv-basma.txt', 'cv completo', 'cv')
    const id = up.data.id as string
    await runExtraction(id)

    const { ops } = (await json('POST', `/documents/${id}/import/preview`)).data
    const colls = ops!.map((o: { coll: string }) => o.coll)
    expect(colls).toContain('experiences')
    expect(colls).toContain('education')
    expect(colls).toContain('skills')
    expect(colls).toContain('projects')

    await json('POST', `/documents/${id}/import`, { ops })
    expect(((await json('GET', '/profile/skills')).data)).toHaveLength(2)
    expect(((await json('GET', '/profile/experiences')).data)).toHaveLength(1)
  })

  it('scope por perfil activo: docs de otro perfil invisibles', async () => {
    const up = await upload('solo-perfil-a.txt', 'x', 'diploma')
    const p2 = (await json('POST', '/profiles', { name: 'Otro' })).data
    await json('POST', `/profiles/${p2.id}/activate`)

    const list = (await json('GET', '/documents')).data
    expect(list).toHaveLength(0)
    const detail = await json('GET', `/documents/${up.data.id}`)
    expect(detail.status).toBe(404)
  })
})

// helper para asegurar que uploads guardan el binario
describe('US2 almacenamiento', () => {
  it('el archivo queda en data/uploads con contenido íntegro', async () => {
    const content = 'CONTENIDO-UNICO-123'
    await upload('archivo-guardado.txt', content, 'other')
    const { readdirSync, readFileSync } = await import('node:fs')
    const files = readdirSync(join(tmp, 'uploads'))
    expect(files.length).toBeGreaterThan(0)
    const saved = readFileSync(join(tmp, 'uploads', files[0]!), 'utf8')
    expect(saved).toContain(content)
  })
})
