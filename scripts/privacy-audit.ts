/**
 * T052 — Auditoría de privacidad (SC-006 / FR-025).
 * Simula uso real con una api_key y verifica que NUNCA aparezca en:
 *  - data/logs/app.log
 *  - respuesta de /api/system/diagnostics
 *  - respuesta de /api/system/logs/tail
 *  - tweakcv.db (dump binario)
 * Exit 1 si hay leak.
 */
process.env.TWEAKCV_DATA_DIR = '.privacy-audit-tmp'

import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createApp } from '../src/server/app.ts'
import { closeDb } from '../src/server/db/index.ts'

const KEY = 'sk-audit-LEAK-PROBE-9f3c1'
let failures = 0

async function main() {
  rmSync('.privacy-audit-tmp', { recursive: true, force: true })
  const app = createApp()

  // actividad con key: settings PUT + error logueado con key en meta
  await app.request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ api_key: KEY, provider_preset: 'openai', model: 'gpt-x' }),
    headers: { 'content-type': 'application/json' },
  })
  const diagRes = await app.request('/api/system/diagnostics')
  const diag = await diagRes.text()
  const tailRes = await app.request('/api/system/logs/tail?n=100')
  const tail = await tailRes.text()

  closeDb()
  mkdirSync('.privacy-audit-tmp', { recursive: true })

  let dbDump = ''
  try {
    dbDump = readFileSync('.privacy-audit-tmp/tweakcv.db').toString('latin1')
  } catch {
    /* db puede no existir si nada la abrió */
  }
  let logDump = ''
  try {
    logDump = readFileSync('.privacy-audit-tmp/logs/app.log', 'utf8')
  } catch {
    /* sin log */
  }

  const surfaces: Array<[string, string]> = [
    ['diagnostics', diag],
    ['logs/tail', tail],
    ['app.log', logDump],
    ['tweakcv.db', dbDump],
  ]

  for (const [name, content] of surfaces) {
    if (content.includes(KEY)) {
      console.error(`PRIVACY LEAK: api_key encontrada en ${name}`)
      failures++
    } else {
      console.log(`ok: ${name} sin api_key`)
    }
  }

  rmSync('.privacy-audit-tmp', { recursive: true, force: true })
  if (failures > 0) process.exit(1)
  console.log('Auditoría de privacidad OK (SC-006)')
}

void main()
