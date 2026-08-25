import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiClientError } from './client'

export interface DocRow {
  id: string
  name: string
  mime: string
  kind: string
  description: string
  status: 'pending' | 'reviewed' | 'imported' | 'error'
  extracted: Record<string, unknown> | null
  extraction_meta: { state?: 'queued' | 'running' | 'done' | 'error'; error_message?: string; [k: string]: unknown }
}

export interface ImportOp {
  action: 'create' | 'update'
  coll: string
  id?: string
  fields: Record<string, { old: unknown; new: unknown }>
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<DocRow[]>('/documents'),
    refetchInterval: (q) =>
      q.state.data?.some((d) => d.extraction_meta.state === 'queued' || d.extraction_meta.state === 'running')
        ? 1000
        : false,
  })
}

function useInvalidateDocs() {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: ['documents'] })
    await qc.invalidateQueries({ queryKey: ['profiles'] })
    await qc.invalidateQueries({ queryKey: ['coll'] })
  }
}

export function useUploadDocument() {
  const invalidate = useInvalidateDocs()
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind?: string }) => {
      const form = new FormData()
      form.set('file', file)
      if (kind) form.set('kind', kind)
      const res = await fetch('/api/documents', { method: 'POST', body: form })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null
        throw new ApiClientError(body?.error?.code ?? 'unknown', body?.error?.message ?? `HTTP ${res.status}`, res.status)
      }
      return res.json()
    },
    onSuccess: invalidate,
  })
}

export function usePatchDocument() {
  const invalidate = useInvalidateDocs()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; kind?: string; description?: string; extracted_json?: unknown }) =>
      api.patch<DocRow>(`/documents/${id}`, body),
    onSuccess: invalidate,
  })
}

export function useReextractDocument() {
  const invalidate = useInvalidateDocs()
  return useMutation({
    mutationFn: (id: string) => api.post<DocRow>(`/documents/${id}/reextract`),
    onSuccess: invalidate,
  })
}

export function useImportResumeJson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const resume = JSON.parse(await file.text()) as unknown
      return api.post<{ id: string; kind: string; status: string }>('/documents/import/resume', { resume })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocs()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/documents/${id}`),
    onSuccess: invalidate,
  })
}

export function useImportPreview(id: string | null) {
  return useQuery({
    queryKey: ['documents', id, 'preview'],
    enabled: id !== null,
    queryFn: () => api.post<{ ops: ImportOp[] }>(`/documents/${id}/import/preview`),
  })
}

export function useImportDocument() {
  const invalidate = useInvalidateDocs()
  return useMutation({
    mutationFn: ({ id, ops }: { id: string; ops: ImportOp[] }) =>
      api.post<{ imported: number }>(`/documents/${id}/import`, { ops }),
    onSuccess: invalidate,
  })
}
