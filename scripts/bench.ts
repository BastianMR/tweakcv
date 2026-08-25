/**
 * T053 — Bench SC-008: ops locales <1s, export PDF <10s.
 * Usa provider mock + SQLite temporal. Exit 1 si excede umbrales.
 */
process.env.TWEAKCV_DATA_DIR = '.bench-tmp'

import { rmSync } from 'node:fs'
import { createApp } from '../src/server/app.ts'
import { closeDb } from '../src/server/db/index.ts'

const OP_BUDGET_MS = 1_000
const EXPORT_BUDGET_MS = 10_000

async function timed(name: string, fn: () => Promise<unknown> | unknown): Promise<number> {
  const t0 = performance.now()
  await fn()
  const ms = Math.round(performance.now() - t0)
  console.log(`${name.padEnd(28)} ${String(ms).padStart(6)} ms`)
  return ms
}

async function main() {
  rmSync('.bench-tmp', { recursive: true, force: true })
  const app = createApp()
  const j = async (method: string, path: string, body?: unknown) => {
    const res = await app.request(`/api${path}`, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
    })
    return res.json()
  }

  const failures: string[] = []
  let lastMs = 0

  await j('POST', '/profiles', { name: 'Bench', contact: { email: 'b@x.co' }, summary: 'Perfil bench' })
  await j('POST', '/profile/experiences', {
    company: 'Acme', role: 'Dev', start_date: '2020-01',
    achievements: ['API REST', 'Migró a TS', 'CI/CD'],
  })
  await j('POST', '/profile/skills', { name: 'TypeScript', category: 'technical', level: 4 })

  lastMs = await timed('POST /postings (parse mock)', () => j('POST', '/postings', { raw_text: 'dev typescript postgresql' }))
  if (lastMs > OP_BUDGET_MS) failures.push(`postings ${lastMs}ms > ${OP_BUDGET_MS}ms`)

  const posting = (await j('GET', '/postings'))[0] as { id: string }
  lastMs = await timed('POST /cvs/generate', () => j('POST', '/cvs/generate', { posting_id: posting.id }))
  if (lastMs > OP_BUDGET_MS) failures.push(`generate ${lastMs}ms > ${OP_BUDGET_MS}ms`)

  const cvs = (await j('GET', '/cvs')) as Array<{ id: string }>
  lastMs = await timed('POST /cvs/:id/export (pdf+md+json)', () =>
    app.request(`/api/cvs/${cvs[cvs.length - 1]!.id}/export`, { method: 'POST' }).then((r) => r.json()),
  )
  if (lastMs > EXPORT_BUDGET_MS) failures.push(`export ${lastMs}ms > ${EXPORT_BUDGET_MS}ms`)

  lastMs = await timed('POST /cvs/:id/evaluate', () => j('POST', `/cvs/${cvs[cvs.length - 1]!.id}/evaluate`, {}))
  if (lastMs > OP_BUDGET_MS) failures.push(`evaluate ${lastMs}ms > ${OP_BUDGET_MS}ms`)

  closeDb()
  rmSync('.bench-tmp', { recursive: true, force: true })

  if (failures.length > 0) {
    console.error('\nSC-008 FALLIDO:')
    for (const f of failures) console.error(`  ✗ ${f}`)
    process.exit(1)
  }
  console.log('\nSC-008 OK (ops <1s · export <10s)')
}

void main()
