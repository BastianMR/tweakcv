import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface ParsedPosting {
  title: string
  company?: string | null
  language: string
  hardRequirements: string[]
  niceToHave: string[]
  keywords: string[]
}

export interface PostingRow {
  id: string
  source: 'text' | 'image'
  raw_text: string | null
  has_image: boolean
  parsed: ParsedPosting | null
  status: 'draft' | 'parsed'
  created_at: string
}

function useInvalidatePostings() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['postings'] })
}

export function usePostings() {
  return useQuery({ queryKey: ['postings'], queryFn: () => api.get<PostingRow[]>('/postings') })
}

export function useCreatePosting() {
  const invalidate = useInvalidatePostings()
  return useMutation({
    mutationFn: (raw_text: string) => api.post<PostingRow>('/postings', { raw_text }),
    onSuccess: invalidate,
  })
}

export function useUpdatePosting() {
  const invalidate = useInvalidatePostings()
  return useMutation({
    mutationFn: ({ id, ...parsed }: { id: string } & Partial<ParsedPosting>) =>
      api.patch<PostingRow>(`/postings/${id}`, parsed),
    onSuccess: invalidate,
  })
}

export function useDeletePosting() {
  const invalidate = useInvalidatePostings()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/postings/${id}`),
    onSuccess: invalidate,
  })
}
