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

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-us1-'))
  process.env.TWEAKCV_DATA_DIR = tmp
  const mod = await import('../../src/server/app')
  app = mod.createApp()
})

afterEach(() => {
  closeDb()
  rmSync(tmp, { recursive: true, force: true })
})

describe('US1 perfiles (FR-024)', () => {
  it('POST crea primer perfil activo automáticamente', async () => {
    const { status, data } = await json('POST', '/profiles', {
      name: 'Dev',
      contact: { email: 'dev@test.co' },
    })
    expect(status).toBe(201)
    expect(data.name).toBe('Dev')
    expect(data.is_active).toBe(true)
  })

  it('segundo perfil nace inactivo; activate conmuta en tx', async () => {
    const p1 = (await json('POST', '/profiles', { name: 'A', contact: { email: 'a@t.co' } })).data
    const p2 = (await json('POST', '/profiles', { name: 'B', contact: { phone: '+541100' } })).data
    expect(p2.is_active).toBe(false)

    const act = await json('POST', `/profiles/${p2.id}/activate`)
    expect(act.status).toBe(200)

    const list = (await json('GET', '/profiles')).data
    const byId = Object.fromEntries(list.map((p: { id: string; is_active: boolean }) => [p.id, p.is_active]))
    expect(byId[p1.id]).toBe(false)
    expect(byId[p2.id]).toBe(true)
  })

  it('PATCH renombra perfil', async () => {
    const p = (await json('POST', '/profiles', { name: 'A' })).data
    const { status, data } = await json('PATCH', `/profiles/${p.id}`, { name: 'A2', summary: 'nuevo' })
    expect(status).toBe(200)
    expect(data.name).toBe('A2')
    expect(data.summary).toBe('nuevo')
  })

  it('DELETE rechaza borrar el único perfil', async () => {
    const p = (await json('POST', '/profiles', { name: 'Único' })).data
    const del = await json('DELETE', `/profiles/${p.id}`)
    expect(del.status).toBe(409)
    expect(del.data.error.code).toBe('cannot_delete_last_profile')
  })

  it('DELETE borra perfil inactivo y sus colecciones (cascade)', async () => {
    const p1 = (await json('POST', '/profiles', { name: 'A' })).data
    const p2 = (await json('POST', '/profiles', { name: 'B' })).data
    await json('POST', `/profiles/${p2.id}/activate`)
    await json('POST', '/profile/experiences', {
      company: 'X', role: 'Dev', start_date: '2020-01', achievements: ['a'],
    })

    // la experiencia quedó en p2 (activo); p1 se borra sin colecciones
    const del = await json('DELETE', `/profiles/${p1.id}`)
    expect(del.status).toBe(204)

    // p2 sigue activo y su experiencia vive
    const exps = (await json('GET', '/profile/experiences')).data
    expect(exps).toHaveLength(1)
    expect((await json('GET', '/profiles')).data).toHaveLength(1)
  })

  it('GET /profiles/active sin perfiles → 404 no_profile (onboarding)', async () => {
    const { status, data } = await json('GET', '/profiles/active')
    expect(status).toBe(404)
    expect(data.error.code).toBe('no_profile')
  })

  it('GET /profiles/active devuelve perfil + colecciones completas', async () => {
    await json('POST', '/profiles', { name: 'Dev', contact: { email: 'd@t.co' }, summary: 's' })
    await json('POST', '/profile/skills', { name: 'TS', category: 'technical', level: 4 })
    const { status, data } = await json('GET', '/profiles/active')
    expect(status).toBe(200)
    expect(data.profile.name).toBe('Dev')
    expect(data.skills).toHaveLength(1)
    expect(data.experiences).toEqual([])
  })
})

describe('US1 colecciones (FR-002)', () => {
  beforeEach(async () => {
    await json('POST', '/profiles', { name: 'Dev' })
  })

  it.each([
    ['experiences', { company: 'Acme', role: 'Dev', start_date: '2020-01', achievements: ['x'] }, { location: 'CBA' }],
    ['education', { institution: 'UBA', degree: 'Lic', start_date: '2015-03', status: 'completed' }, { field: 'Informática' }],
    ['projects', { name: 'Foo', tech: ['ts'], highlights: ['h'] }, { description: 'd' }],
  ])('CRUD completo de %s', async (coll, payload, patchExtra) => {
    const created = await json('POST', `/profile/${coll}`, payload)
    expect(created.status).toBe(201)
    expect(created.data.profile_id).toBeDefined()

    const patched = await json('PATCH', `/profile/${coll}/${created.data.id}`, {
      ...payload,
      ...patchExtra,
    })
    expect(patched.status).toBe(200)
    const [patchKey, patchValue] = Object.entries(patchExtra)[0]!
    expect(patched.data[patchKey]).toBe(patchValue)

    const list = (await json('GET', `/profile/${coll}`)).data
    expect(list).toHaveLength(1)

    const del = await json('DELETE', `/profile/${coll}/${created.data.id}`)
    expect(del.status).toBe(204)
    expect(((await json('GET', `/profile/${coll}`)).data)).toHaveLength(0)
  })

  it('validación zod rechaza payload inválido con validation_error', async () => {
    const bad = await json('POST', '/profile/experiences', {
      company: 'Acme', role: 'Dev', start_date: '2020-13', achievements: [],
    })
    expect(bad.status).toBe(400)
    expect(bad.data.error.code).toBe('validation_error')
  })

  it('coll desconocida → 404 not_found', async () => {
    const { status } = await json('GET', '/profile/whatever')
    expect(status).toBe(404)
  })

  it('PATCH/DELETE de fila de otro perfil → 404', async () => {
    const skill = (
      await json('POST', '/profile/skills', { name: 'Go', category: 'technical', level: 3 })
    ).data
    const p2 = (await json('POST', '/profiles', { name: 'Otro' })).data
    await json('POST', `/profiles/${p2.id}/activate`)

    const patch = await json('PATCH', `/profile/skills/${skill.id}`, { name: 'Go2' })
    expect(patch.status).toBe(404)
    const del = await json('DELETE', `/profile/skills/${skill.id}`)
    expect(del.status).toBe(404)
  })
})

describe('US1 skills (FR-003) + unicidad', () => {
  beforeEach(async () => {
    await json('POST', '/profiles', { name: 'Dev' })
  })

  it('language exige cefr y rechaza level numérico', async () => {
    const ok = await json('POST', '/profile/skills', {
      name: 'Inglés', category: 'language', cefr: 'C1',
    })
    expect(ok.status).toBe(201)

    const sinCefr = await json('POST', '/profile/skills', { name: 'Portugués', category: 'language' })
    expect(sinCefr.status).toBe(400)

    const conLevel = await json('POST', '/profile/skills', {
      name: 'Francés', category: 'language', level: 5,
    })
    expect(conLevel.status).toBe(400)
  })

  it('duplicado case-insensitive por (perfil, nombre, categoría) → 409 duplicate_skill', async () => {
    const first = await json('POST', '/profile/skills', {
      name: 'TypeScript', category: 'technical', level: 4,
    })
    expect(first.status).toBe(201)

    const dup = await json('POST', '/profile/skills', {
      name: 'typescript', category: 'technical', level: 3,
    })
    expect(dup.status).toBe(409)
    expect(dup.data.error.code).toBe('duplicate_skill')

    // misma skill en otra categoría sí pasa
    const otherCat = await json('POST', '/profile/skills', {
      name: 'TypeScript', category: 'soft',
    })
    expect(otherCat.status).toBe(201)
  })
})
