import type { Hono } from 'hono'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDb, dataDir } from '../db'
import { makeCrud } from '../db/repo'
import { ApiError } from '../errors'
import { documentPatchSchema, toDocumentApi } from '../../shared/schemas/document'
import type { DocumentRow } from '../../shared/schemas/document'
import { requireActiveProfile } from './shared'
import { runExtraction } from '../documents/extraction'
import { applyImport, buildImportPreview } from '../documents/import'
import { importResumeJson } from '../resumeio/import'
import { z } from 'zod'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const repo = () => makeCrud<DocumentRow>(getDb(), 'document')

function ownedDoc(id: string): DocumentRow {
  const active = requireActiveProfile()
  const doc = repo().get(id)
  if (!doc || doc.profile_id !== active.id) {
    throw new ApiError('not_found', `documento ${id} inexistente`, 404)
  }
  return doc
}

export function registerDocumentRoutes(app: Hono) {
  app.get('/api/documents', (c) => {
    const active = requireActiveProfile()
    return c.json(repo().list({ profile_id: active.id }).map(toDocumentApi))
  })

  app.post('/api/documents', async (c) => {
    const active = requireActiveProfile()
    const form = await c.req.parseBody()
    const file = form.file
    if (!(file instanceof File)) {
      throw new ApiError('validation_error', 'campo multipart "file" requerido', 400)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError('payload_too_large', 'máximo 25MB por archivo', 413)
    }

    const kindRaw = typeof form.kind === 'string' ? form.kind : undefined
    const kind = ['diploma', 'cv', 'assessment_result', 'certificate', 'transcript', 'other'].includes(
      kindRaw ?? '',
    )
      ? kindRaw!
      : /cv|resume|curr[ií]culum/i.test(file.name)
        ? 'cv'
        : 'other'

    const id = crypto.randomUUID()
    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'documento'
    const storedPath = join('uploads', `${id}-${safeName}`)
    const absPath = join(dataDir(), storedPath)
    mkdirSync(join(dataDir(), 'uploads'), { recursive: true })
    writeFileSync(absPath, Buffer.from(await file.arrayBuffer()))

    const created = repo().create({
      id,
      profile_id: active.id,
      original_name: file.name,
      stored_path: storedPath.replaceAll('\\', '/'),
      mime: file.type || 'application/octet-stream',
      kind: kind as DocumentRow['kind'],
      extraction_meta_json: JSON.stringify({ state: 'queued' }),
    })

    // extracción async fire-and-forget; polling vía GET (contrato api.md)
    void runExtraction(id)

    return c.json(toDocumentApi(created), 201)
  })

  app.get('/api/documents/:id', (c) => c.json(toDocumentApi(ownedDoc(c.req.param('id')))))

  app.patch('/api/documents/:id', async (c) => {
    const doc = ownedDoc(c.req.param('id'))
    const body = documentPatchSchema.parse(await c.req.json())
    const patch: Partial<DocumentRow> = {}
    if (body.kind !== undefined) patch.kind = body.kind
    if (body.description !== undefined) patch.description = body.description
    let status = doc.status
    if (body.extracted_json !== undefined) {
      // el cliente manda extracted como objeto → validar contra schema por kind
      patch.extracted_json = JSON.stringify(body.extracted_json ?? null)
      status = 'reviewed' // contrato api.md: editar extracted_json → reviewed
    }
    const updated = repo().update(doc.id, { ...patch, ...(status !== doc.status && { status }) })
    return c.json(toDocumentApi(updated!))
  })

  app.post('/api/documents/:id/reextract', (c) => {
    const doc = ownedDoc(c.req.param('id'))
    if (doc.status === 'imported') {
      throw new ApiError('already_imported', 'no se re-extrae un documento importado', 409)
    }
    repo().update(doc.id, {
      status: 'pending',
      extraction_meta_json: JSON.stringify({ state: 'queued' }),
      updated_at: new Date().toISOString(),
    })
    void runExtraction(doc.id)
    return c.json(toDocumentApi(repo().get(doc.id)!))
  })

  app.post('/api/documents/:id/import/preview', (c) => {
    const doc = ownedDoc(c.req.param('id'))
    return c.json(buildImportPreview(doc.id))
  })

  app.post('/api/documents/:id/import', async (c) => {
    const doc = ownedDoc(c.req.param('id'))
    const body = z.object({ ops: z.array(z.unknown()).min(0) }).parse(await c.req.json())
    const result = applyImport(doc.id, body.ops as Parameters<typeof applyImport>[1])
    return c.json(result)
  })

  app.post('/api/documents/import/resume', async (c) => {
    const body = z.object({ resume: z.unknown() }).parse(await c.req.json())
    return c.json(importResumeJson(body.resume), 201)
  })

  app.delete('/api/documents/:id', (c) => {
    const doc = ownedDoc(c.req.param('id'))
    const db = getDb()
    db.transaction(() => {
      // FR-010: entidades ya importadas quedan; la trazabilidad se marca orphaned
      db.prepare('UPDATE imported_entity SET orphaned = 1 WHERE document_id = ?').run(doc.id)
      repo().remove(doc.id)
    })()
    rmSync(join(dataDir(), doc.stored_path), { force: true })
    return c.body(null, 204)
  })
}
