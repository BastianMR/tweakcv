import { useQuery } from '@tanstack/react-query'
import { api } from './client'

interface Health {
  ok: boolean
}

/** Ejemplo canónico de query hook; los recursos reales llegan con US1+. */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<Health>('/health'),
  })
}
