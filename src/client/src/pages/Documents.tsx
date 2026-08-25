import { useRef, useState } from 'react'
import { DocumentTable } from '../components/DocumentTable'
import { SlideOverPanel } from '../components/SlideOverPanel'
import { useDocuments, useUploadDocument, useImportResumeJson } from '../api/documents'
import type { DocRow } from '../api/documents'
import { ASSESSMENT_CATALOG } from '../data/assessmentCatalog'

const btn = 'border rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-50'

export function DocumentsPage() {
  const documents = useDocuments()
  const upload = useUploadDocument()
  const importResume = useImportResumeJson()
  const [selected, setSelected] = useState<DocRow | null>(null)
  const [kind, setKind] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const resumeRef = useRef<HTMLInputElement>(null)

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await upload.mutateAsync({ file, ...(kind && { kind }) })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4" data-testid="documents-page">
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-sm">
          <span className="opacity-70 block">Tipo (opcional)</span>
          <select className="border rounded px-2 py-1" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">auto</option>
            <option value="diploma">diploma</option>
            <option value="certificate">certificate</option>
            <option value="transcript">transcript</option>
            <option value="cv">cv</option>
            <option value="assessment_result">assessment_result</option>
            <option value="other">other</option>
          </select>
        </label>
        <input ref={fileRef} type="file" multiple onChange={(e) => void onFiles(e.target.files)} data-testid="file-input" />
        <button className={btn} onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          Subir documento
        </button>
        <input
          ref={resumeRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importResume.mutate(f)
            e.target.value = ''
          }}
          data-testid="resume-input"
        />
        <button
          className={btn}
          data-testid="import-resume-btn"
          onClick={() => resumeRef.current?.click()}
          disabled={importResume.isPending}
        >
          Importar resume.json
        </button>
        <p className="text-xs opacity-50">máx. 25MB · extracción IA con tu proveedor configurado</p>
      </div>

      {upload.error && (
        <p role="alert" className="text-red-600 text-sm">
          {String(upload.error)}
        </p>
      )}
      {importResume.error && (
        <p role="alert" className="text-red-600 text-sm">
          {String(importResume.error)}
        </p>
      )}

      {documents.data && documents.data.length > 0 && (
        <DocumentTable documents={documents.data} onSelect={setSelected} selectedId={selected?.id} />
      )}
      {documents.data?.length === 0 && <p className="opacity-60">Todavía no hay documentos.</p>}

      <details className="border rounded p-3 text-sm" data-testid="assessment-catalog">
        <summary className="cursor-pointer font-medium">Assessments recomendados</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {ASSESSMENT_CATALOG.map((a) => (
            <li key={a.type}>
              <a href={a.url} target="_blank" rel="noreferrer" className="underline">
                {a.label}
              </a>{' '}
              <span className="opacity-50">({a.type})</span>
            </li>
          ))}
        </ul>
      </details>

      {selected && <SlideOverPanel doc={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
