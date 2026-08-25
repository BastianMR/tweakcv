import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useT } from '../i18n'
import { useCvPreview, useExportCv, useGenerateCv, useCvs, useEvaluateCv } from '../api/cvs'
import type { CvFull } from '../api/cvs'
import { api } from '../api/client'
import { usePostings } from '../api/postings'
import { ScoreReport } from '../components/ScoreReport'

const btn = 'border rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-50'

function useCvFull(id: string | null) {
  return useQuery({
    queryKey: ['cvs', id, 'full'],
    enabled: !!id,
    queryFn: () => api.get<CvFull>(`/cvs/${id}`),
  })
}

export function StudioPage() {
  const t = useT()
  const [params] = useSearchParams()
  const postings = usePostings()
  const cvs = useCvs()
  const generate = useGenerateCv()
  const exportCv = useExportCv()
  const evaluate = useEvaluateCv()

  const [postingId, setPostingId] = useState<string>(params.get('posting') ?? '')
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const [currentId, setCurrentId] = useState<string | null>(params.get('id'))

  // si no hay selección explícita mostramos el más reciente
  const previewId = currentId ?? cvs.data?.[0]?.id ?? null
  const preview = useCvPreview(previewId)
  const full = useCvFull(previewId)

  async function onGenerate(parent?: { id: string; suggestion?: string }) {
    const created = await generate.mutateAsync({
      ...(postingId && { posting_id: postingId }),
      language,
      ...(parent && { parent_cv_id: parent.id }),
      ...(parent?.suggestion && { instructions: parent.suggestion }),
    })
    setCurrentId(created.id)
    // iteración (US4): evaluar el hijo automáticamente para comparar scores
    if (parent) void evaluate.mutateAsync(created.id)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="studio-page">
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-sm">
          <span className="opacity-70 block">Postulación</span>
          <select
            data-testid="posting-select"
            className="border rounded px-2 py-1"
            value={postingId}
            onChange={(e) => setPostingId(e.target.value)}
          >
            <option value="">CV general (sin posting)</option>
            {postings.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.parsed?.title ?? '(sin parsear)'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="opacity-70 block">Idioma del CV</span>
          <select
            data-testid="cv-lang-select"
            className="border rounded px-2 py-1"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
        </label>
        <button
          className={`${btn} font-semibold`}
          onClick={() => void onGenerate()}
          disabled={generate.isPending}
          data-testid="generate-btn"
        >
          {generate.isPending ? 'Generando…' : 'Generar CV'}
        </button>

        {previewId && (
          <>
            <button
              className={btn}
              onClick={() => evaluate.mutate(previewId)}
              disabled={evaluate.isPending}
              data-testid="evaluate-btn"
            >
              {evaluate.isPending ? 'Evaluando…' : 'Evaluar ATS'}
            </button>
            <button
              className={btn}
              data-testid="export-btn"
              disabled={exportCv.isPending}
              onClick={() => void exportCv.mutateAsync(previewId)}
            >
              Exportar (PDF/md/JSON)
            </button>
          </>
        )}
      </div>

      {(generate.error || evaluate.error || exportCv.error) && (
        <p role="alert" className="text-red-600 text-sm">
          {String(generate.error ?? evaluate.error ?? exportCv.error)}
        </p>
      )}
      {exportCv.isSuccess && (
        <p className="text-green-700 text-sm" data-testid="export-result">
          Exportado a data/{Object.values(exportCv.data)[0]}
        </p>
      )}

      {/* US4: score + iteración desde sugerencia (T047/T048) */}
      {full.data?.score && (
        <>
          <ScoreReport score={full.data.score} />
          {(full.data.score.topSuggestions?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <button
                className={`${btn} font-semibold`}
                data-testid="iterate-btn"
                disabled={generate.isPending}
                onClick={() =>
                  void onGenerate({
                    id: full.data!.id,
                    suggestion: full.data!.score!.topSuggestions![0],
                  })
                }
              >
                ↻ Regenerar aplicando sugerencia #1
              </button>
              <span className="text-xs opacity-60">crea un snapshot hijo vinculado al actual</span>
            </div>
          )}
        </>
      )}

      <div className="border rounded overflow-hidden h-[70vh]" data-testid="cv-preview-frame">
        {preview.data ? (
          <iframe title="CV preview" srcDoc={preview.data.html} className="w-full h-full" sandbox="" />
        ) : (
          <p className="p-4 opacity-60">{t('common.loading')}</p>
        )}
      </div>
    </div>
  )
}
