import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Profile } from '../../../shared/schemas/profile'

export interface ProfileFull {
  profile: Profile
  experiences: Record<string, unknown>[]
  education: Record<string, unknown>[]
  skills: SkillRow[]
  projects: Record<string, unknown>[]
}

export interface SkillRow {
  id: string
  name: string
  category: 'technical' | 'soft' | 'language'
  level: number | null
  cefr: string | null
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.get<Profile[]>('/profiles'),
  })
}

export function useActiveProfile() {
  return useQuery({
    queryKey: ['profiles', 'active'],
    queryFn: () => api.get<ProfileFull>('/profiles/active'),
    retry: false,
  })
}

export function useInvalidateProfiles() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['profiles'] })
}

export function useCreateProfile() {
  const invalidate = useInvalidateProfiles()
  return useMutation({
    mutationFn: (body: { name: string; contact?: unknown; summary?: string }) =>
      api.post<Profile>('/profiles', body),
    onSuccess: invalidate,
  })
}

export function useActivateProfile() {
  const invalidate = useInvalidateProfiles()
  return useMutation({
    mutationFn: (id: string) => api.post(`/profiles/${id}/activate`),
    onSuccess: invalidate,
  })
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfiles()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; summary?: string; contact?: unknown }) =>
      api.patch<Profile>(`/profiles/${id}`, body),
    onSuccess: invalidate,
  })
}

/** colecciones scopeadas al perfil activo */
export function useCollection<T extends { id: string }>(coll: string) {
  return useQuery({
    queryKey: ['coll', coll],
    queryFn: () => api.get<T[]>(`/profile/${coll}`),
  })
}

function useCollInvalidator(coll: string) {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: ['coll', coll] })
    await qc.invalidateQueries({ queryKey: ['profiles'] })
  }
}

export function useCreateInColl<T extends object>(coll: string) {
  const invalidate = useCollInvalidator(coll)
  return useMutation({
    mutationFn: (body: T) => api.post(`/profile/${coll}`, body),
    onSuccess: invalidate,
  })
}

export function useUpdateInColl(coll: string) {
  const invalidate = useCollInvalidator(coll)
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch(`/profile/${coll}/${id}`, body),
    onSuccess: invalidate,
  })
}

export function useDeleteInColl(coll: string) {
  const invalidate = useCollInvalidator(coll)
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/profile/${coll}/${id}`),
    onSuccess: invalidate,
  })
}
