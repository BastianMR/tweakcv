import { useState } from 'react'
import { useImportDocument, useImportPreview, usePatchDocument, useReextractDocument, useDeleteDocument } from '../api/documents'
import type { DocRow } from '../api/documents'

const btn = 'border rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-50'
const inputCls = 'border rounded px-2 py-1 w-full'

/** Modal de revisión de diff (FR-006): nada se escribe sin aprobar acá */
export function DiffReview({ doc, onClose }: { doc: DocRow; onClose: () => void }) {
  const preview = useImportPreview(doc.id)
  const importDoc = useImportDocument()
  const [approved, setApproved] = useState<Set<number>>(new Set())

  const ops = preview.data?.ops ?? []

  function toggle(i: number) {
    setApproved((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function confirm() {
    const chosen = ops.filter((_, i) => approved.has(i))
    await importDoc.mutateAsync({ id: doc.id, ops: chosen })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal>
      <div className="bg-white text-black rounded-lg p-4 max-w-xl w-full max-h-[80vh] overflow-auto" data-testid="diff-review">
        <h3 className="font-semibold mb-2">Revisar cambios antes de aplicar</h3>
        {preview.isLoading && <p>Cargando diff…</p>}
        {!preview.isLoading && ops.length === 0 && <p>No hay cambios que aplicar.</p>}
        <ul className="flex flex-col gap-2">
          {ops.map((op, i) => (
            <li key={i} className="border rounded p-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={approved.has(i)} onChange={() => toggle(i)} />
                <strong>
                  {op.action === 'create' ? 'Crear' : 'Actualizar'} en {op.coll}
                </strong>
              </label>
              <table className="mt-1 w-full">
                <thead>
                  <tr className="text-left opacity-60">
                    <th>campo</th>
                    <th>actual</th>
                    <th>nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(op.fields).map(([field, diff]) => (
                    <tr key={field}>
                      <td className="pr-2">{field}</td>
                      <td className="pr-2 opacity-60">{JSON.stringify(diff.old)}</td>
                      <td>{JSON.stringify(diff.new)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
        {importDoc.error && (
          <p role="alert" className="text-red-600 text-sm mt-2">
            {String(importDoc.error)}
          </p>
        )}
        <div className="flex gap-2 justify-end mt-3">
          <button className={btn} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`${btn} font-semibold`}
            data-testid="import-confirm"
            disabled={approved.size === 0 || importDoc.isPending}
            onClick={() => void confirm()}
          >
            Importar aprobados ({approved.size})
          </button>
        </div>
      </div>
    </div>
  )
}

/** Panel lateral editable-inline (T032): propiedades + acciones */
export function SlideOverPanel({ doc, onClose }: { doc: DocRow; onClose: () => void }) {
  const patch = usePatchDocument()
  const reextract = useReextractDocument()
  const del = useDeleteDocument()
  const [description, setDescription] = useState(doc.description)
  const [extractedText, setExtractedText] = useState(() => JSON.stringify(doc.extracted ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  function save() {
    let parsed: unknown
    try {
      parsed = JSON.parse(extractedText)
    } catch {
      setError('JSON inválido')
      return
    }
    patch.mutate(
      {
        id: doc.id,
        description,
        ...(parsed && Object.keys(parsed as object).length > 0 ? { extracted_json: parsed } : {}),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white text-black shadow-xl z-40 overflow-auto"
      data-testid="slideover"
    >
      <div className="p-4 flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{doc.name}</h3>
          <button onClick={onClose} aria-label="close">×</button>
        </header>

        <label className="text-sm block">
          <span className="opacity-70">Descripción</span>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="text-sm block">
          <span className="opacity-70">Datos extraídos (JSON)</span>
          <textarea
            className={`${inputCls} font-mono text-xs`}
            rows={14}
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="text-red-600 text-xs">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          <button className={`${btn} font-semibold`} data-testid="save-doc" onClick={save}>
            Guardar
          </button>
          <button className={btn} onClick={() => reextract.mutate(doc.id)}>
            Re-extraer
          </button>
          {doc.extraction_meta.state === 'done' && (
            <button className={`${btn} font-semibold`} data-testid="open-import" onClick={() => setShowDiff(true)}>
              Importar…
            </button>
          )}
          <button
            className={`${btn} text-red-600`}
            onClick={() => {
              if (confirm('¿Eliminar documento? Las entidades ya importadas se conservan.')) {
                del.mutate(doc.id, { onSuccess: onClose })
              }
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      {showDiff && <DiffReview doc={{ ...doc, description }} onClose={() => setShowDiff(false)} />}
    </div>
  )
}
