import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface AtsCheck {
  id: string
  label: string
  status: 'pass' | 'partial' | 'fail' | 'na'
  score: number
  detail?: string
  evidence?: string[]
}

export interface RubricItem {
  criterion: string
  score: number
  evidence: string
  suggestion?: string
}

export interface CvScore {
  total: number
  mechanical: { score: number; checks: AtsCheck[] }
  semantic: { rubric: RubricItem[]; score: number }
  topSuggestions?: string[]
}

export interface CvSummary {
  id: string
  posting_id: string | null
  template_id: string
  language: string
  parent_cv_id: string | null
  score: CvScore | null
  exports: Record<string, string>
  created_at: string
}

export interface CvFull extends CvSummary {
  content: Record<string, unknown>
  data_snapshot: Record<string, unknown>
}

export function useCvs() {
  return useQuery({ queryKey: ['cvs'], queryFn: () => api.get<CvSummary[]>('/cvs') })
}

function useInvalidateCvs() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['cvs'] })
}

export function useGenerateCv() {
  const invalidate = useInvalidateCvs()
  return useMutation({
    mutationFn: (body: { posting_id?: string; language: string; parent_cv_id?: string; instructions?: string }) =>
      api.post<CvSummary>('/cvs/generate', body),
    onSuccess: invalidate,
  })
}

export function useEvaluateCv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CvScore>(`/cvs/${id}/evaluate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cvs'] }),
  })
}

export function useDeleteCv() {
  const invalidate = useInvalidateCvs()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/cvs/${id}`),
    onSuccess: invalidate,
  })
}

/** preview HTML fiel para iframe */
export function useCvPreview(id: string | null) {
  return useQuery({
    queryKey: ['cvs', id, 'preview'],
    enabled: !!id,
    queryFn: () => api.get<{ html: string }>(`/cvs/${id}/preview`),
    staleTime: Infinity,
  })
}

export function useExportCv() {
  const invalidate = useInvalidateCvs()
  return useMutation({
    mutationFn: (id: string) => api.post<{ pdf: string; md: string; json: string }>(`/cvs/${id}/export`),
    onSuccess: invalidate,
  })
}
