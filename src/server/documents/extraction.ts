import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { getDb, dataDir } from '../db'
import { makeCrud } from '../db/repo'
import { createAiClient } from '../ai/client'
import { extractedDocumentSchema, mockExtractFor } from '../ai/ops/extract-document/schema'
import { getLogger } from '../log'

interface DocumentRow {
  id: string
  profile_id: string
  original_name: string
  stored_path: string
  mime: string
  kind: string
  description: string
  extracted_json: string | null
  extraction_meta_json: string
  status: 'pending' | 'reviewed' | 'imported' | 'error'
  created_at: string
  updated_at: string
}

const docs = () => makeCrud<DocumentRow>(getDb(), 'document')

const KIND_INSTRUCTIONS: Record<string, string> = {
  diploma: 'Extraé los datos del diploma académico.',
  certificate: 'Extraé los datos del certificado.',
  transcript: 'Extraé los datos del analítico/historia académica.',
  cv: 'Extraé todas las secciones del CV (contacto, experiencias, educación, skills, proyectos).',
  assessment_result: 'Identificá el tipo de assessment y extraé sus resultados.',
  other: 'Clasificá el documento; si no es estructurable usá kind other con note.',
}

export function documentFilePath(storedPath: string): string {
  // stored_path es relativo a data/ (p.ej. uploads/xxx-file.pdf)
  return resolve(join(dataDir(), storedPath))
}

/**
 * Corre la extracción IA de un documento y actualiza su estado.
 * El route dispara fire-and-forget; los tests la esperan directamente.
 */
export async function runExtraction(documentId: string): Promise<void> {
  const db = getDb()
  const doc = docs().get(documentId)
  if (!doc) return

  const meta = JSON.parse(doc.extraction_meta_json) as Record<string, unknown>
  const history = Array.isArray(meta.history) ? meta.history : []
  const previous = { ...meta, state: meta.state }
  delete (previous as { history?: unknown }).history

  const setMeta = (patch: Record<string, unknown>, status?: DocumentRow['status']) =>
    docs().update(documentId, {
      extraction_meta_json: JSON.stringify({ ...patch, history: [...history, previous] }),
      ...(status && { status }),
      updated_at: new Date().toISOString(),
    })

  try {
    setMeta({ ...meta, state: 'running', history: [...history, previous] })
    const ai = createAiClient(db)

    const isImage = doc.mime.startsWith('image/')
    const content = await readFile(documentFilePath(doc.stored_path), isImage ? 'base64' : 'utf8')

    const result = await ai.completeJson({
      op: 'extractDocument',
      system:
        'Sos un extractor de datos de documentos. Respondé SOLO JSON válido según el schema. Campos ilegibles → null explícito; jamás inventar valores.',
      user: `${KIND_INSTRUCTIONS[doc.kind] ?? KIND_INSTRUCTIONS.other}\n\nfileName: ${doc.original_name}\nmime: ${doc.mime}`,
      schema: extractedDocumentSchema,
      mockOutput: () => mockExtractFor(doc.kind, doc.original_name),
      ...(isImage && { imageBase64: content }),
    })

    docs().update(documentId, {
      extracted_json: JSON.stringify(result),
      extraction_meta_json: JSON.stringify({
        state: 'done',
        model: ai.isMock() ? 'mock' : undefined,
        extracted_at: new Date().toISOString(),
        confidence: 'confidence' in result ? (result.confidence as number) : undefined,
        history,
      }),
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    getLogger().error(`extracción falló para ${documentId}`, err)
    setMeta(
      { ...meta, state: 'error', error_message: err instanceof Error ? err.message : String(err) },
      'error',
    )
  }
}
