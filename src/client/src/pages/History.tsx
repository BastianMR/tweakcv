import { useNavigate } from 'react-router'
import { useT } from '../i18n'
import { useCvs, useDeleteCv } from '../api/cvs'

export function HistoryPage() {
  const t = useT()
  const navigate = useNavigate()
  const cvs = useCvs()
  const remove = useDeleteCv()

  return (
    <div className="flex flex-col gap-3" data-testid="history-page">
      <h2>Historial de CVs</h2>
      {cvs.data?.length === 0 && <p className="opacity-60">Todavía no generaste ningún CV.</p>}
      {cvs.data?.map((cv) => (
        <article key={cv.id} className="border rounded p-3 flex items-center justify-between gap-2" data-testid={`cv-row-${cv.id}`}>
          <div className="text-sm">
            <strong>{new Date(cv.created_at).toLocaleString()}</strong>{' '}
            {cv.posting_id ? <span>· postulación</span> : <span>· CV general</span>} · {cv.language.toUpperCase()}
            {cv.parent_cv_id && <span className="ml-1 text-blue-700">↳ iteración</span>}
            {cv.score != null && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  cv.score.total >= 75
                    ? 'bg-green-500/15 text-green-700'
                    : cv.score.total >= 50
                      ? 'bg-amber-500/15 text-amber-700'
                      : 'bg-red-500/15 text-red-700'
                }`}
              >
                ATS {cv.score.total}
              </span>
            )}
            {Object.keys(cv.exports).length > 0 && (
              <span className="ml-2 text-green-700">· exportado ({Object.keys(cv.exports).join(', ')})</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="border rounded px-2 py-1 text-sm hover:bg-black/5"
              onClick={() => navigate(`/studio?id=${cv.id}`)}
            >
              Ver
            </button>
            <button
              className="border rounded px-2 py-1 text-sm text-red-600"
              aria-label={`${t('common.delete')} CV`}
              onClick={() => remove.mutate(cv.id)}
            >
              ×
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
