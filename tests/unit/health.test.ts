import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/server/app.ts'

describe('GET /api/health', () => {
  it('responds ok', async () => {
    const res = await createApp().request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
