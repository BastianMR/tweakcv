import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer'
import { getDb, dataDir } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'
import type { CvRow, TailoredCv } from '../../shared/schemas/cv'
import { renderHtml, renderMarkdown } from './render'
import { toJsonResume } from '../resumeio/export'
import type { ProfileSnapshot } from '../routes/cvs'

const repo = () => makeCrud<CvRow>(getDb(), 'generated_cv')

export interface ExportResult {
  pdf: string
  md: string
  json: string
}

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    // Linux CI/containers: unprivileged userns disabled → Chrome needs --no-sandbox
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 8_000 })
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: false,
      margin: { top: '0mm' },
      timeout: 9_000, // contrato SC-008: export < 10s
    })
    return Buffer.from(buffer)
  } finally {
    await browser.close()
  }
}

/**
 * Exporta un snapshot a pdf/md/json (JSON Resume válido) y persiste las rutas.
 * Único UPDATE permitido sobre generated_cv junto con score_json (contrato).
 */
export async function exportCv(cvId: string): Promise<ExportResult> {
  const row = repo().get(cvId)
  if (!row) throw new ApiError('not_found', 'CV inexistente', 404)

  const content = JSON.parse(row.content_json) as TailoredCv
  const snapshot = JSON.parse(row.data_snapshot_json) as ProfileSnapshot
  const html = renderHtml(content, row.language)
  const markdown = renderMarkdown(content)
  const jsonResume = toJsonResume(content, snapshot, {
    templateId: row.template_id,
    cvId: row.id,
    generatedAt: row.created_at,
  })

  // el export DEBE ser 100% válido contra el schema oficial (contrato)
  const { validateExportedResume } = await import('../resumeio/import')
  validateExportedResume(jsonResume)

  const outDir = join(dataDir(), 'exports')
  mkdirSync(outDir, { recursive: true })
  const pdfPath = join(outDir, `${row.id}.pdf`)
  const mdPath = join(outDir, `${row.id}.md`)
  const jsonPath = join(outDir, `${row.id}.json`)

  writeFileSync(pdfPath, await renderPdf(html))
  writeFileSync(mdPath, markdown, 'utf8')
  writeFileSync(jsonPath, JSON.stringify(jsonResume, null, 2), 'utf8')

  const rel = (p: string) => p.split(/[\\/]/).slice(-2).join('/')
  const exports = { pdf: rel(pdfPath), md: rel(mdPath), json: rel(jsonPath) }
  repo().update(row.id, { exports_json: JSON.stringify(exports) })

  return exports
}
