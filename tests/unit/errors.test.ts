import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createApp } from '../../src/server/app'
import { ApiError } from '../../src/server/errors'

// monta rutas de prueba como hijas de la app para que pasen por su onError
function clientWith(path: string, handler: () => never) {
  const probe = new Hono()
  probe.get(path, handler)
  const app = createApp()
  app.route('/__test', probe)
  return (p: string) => app.request(`/__test${p}`)
}

describe('shape de errores', () => {
  it('GET ruta inexistente → 404 con shape estándar', async () => {
    const res = await createApp().request('/no-existe')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: { code: 'not_found', message: expect.any(String) } })
    expect(body.error.message).not.toMatch(/stack|at /i)
  })

  it('ApiError respeta status y code, sin stack trace al cliente', async () => {
    const req = clientWith('/boom-api', () => {
      throw new ApiError('validation_error', 'campo inválido', 422, { campo: 'name' })
    })
    const res = await req('/boom-api')
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('validation_error')
    expect(body.error.detail).toEqual({ campo: 'name' })
    expect(JSON.stringify(body)).not.toMatch(/at .+:\d+/)
  })

  it('error genérico → 500 internal sin filtrar detalles internos', async () => {
    const req = clientWith('/boom-500', () => {
      throw new Error('secreto interno: password=hunter2')
    })
    const res = await req('/boom-500')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('internal')
    expect(JSON.stringify(body)).not.toContain('hunter2')
  })

  it('HTTPException de Hono mapea a shape estándar con su status', async () => {
    const req = clientWith('/teapot', () => {
      throw new HTTPException(418, { message: "I'm a teapot" })
    })
    const res = await req('/teapot')
    expect(res.status).toBe(418)
    const body = await res.json()
    expect(body.error.code).toBe('http_exception')
  })

  it('health sigue funcionando', async () => {
    const res = await createApp().request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
