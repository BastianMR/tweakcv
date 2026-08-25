import { useT } from '../i18n'
import type { DocRow } from '../api/documents'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700',
  reviewed: 'bg-blue-500/15 text-blue-700',
  imported: 'bg-green-500/15 text-green-700',
  error: 'bg-red-500/15 text-red-700',
}

function stateLabel(doc: DocRow): string {
  const state = doc.extraction_meta.state
  if (doc.status === 'error' || state === 'error') return 'error'
  return doc.status
}

/** Grilla estilo Notion (T031): Documento | Descripción | Datos extraídos | Metadata */
export function DocumentTable({
  documents,
  onSelect,
  selectedId,
}: {
  documents: DocRow[]
  onSelect: (doc: DocRow) => void
  selectedId?: string
}) {
  const t = useT()

  return (
    <table className="w-full text-sm border-collapse" data-testid="document-table">
      <thead>
        <tr className="text-left border-b opacity-60">
          <th className="py-1.5 pr-2">Documento</th>
          <th className="pr-2">Descripción</th>
          <th className="pr-2">Datos extraídos</th>
          <th>Metadata</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr
            key={d.id}
            data-testid={`doc-row-${d.id}`}
            onClick={() => onSelect(d)}
            className={`border-b cursor-pointer hover:bg-black/5 ${selectedId === d.id ? 'bg-black/5' : ''}`}
          >
            <td className="py-1.5 pr-2">
              <span className="font-medium">{d.name}</span>{' '}
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${STATUS_STYLES[stateLabel(d)] ?? ''}`}>
                {stateLabel(d)}
                {d.status !== 'error' && d.extraction_meta.state !== 'done'
                  ? ` · ${d.extraction_meta.state}`
                  : ''}
              </span>
            </td>
            <td className="pr-2 max-w-[12rem] truncate">{d.description || '—'}</td>
            <td className="pr-2">
              {d.extracted ? (
                <code className="text-xs">{String((d.extracted as Record<string, unknown>).kind ?? 'json')}</code>
              ) : d.extraction_meta.state === 'running' ? (
                t('common.loading')
              ) : (
                '—'
              )}
            </td>
            <td className="opacity-60 text-xs">
              {d.kind}
              {(d.extraction_meta.error_message && ` · ${d.extraction_meta.error_message}`) || ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
