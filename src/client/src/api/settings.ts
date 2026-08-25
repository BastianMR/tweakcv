import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Settings {
  provider_preset: 'openai' | 'groq' | 'openrouter' | 'ollama' | 'lmstudio' | 'custom' | 'mock'
  base_url: string | null
  model: string | null
  vision_capable: boolean
  ui_language: 'es' | 'en'
  log_level: 'debug' | 'info' | 'warn' | 'error'
}

export const PROVIDER_PRESETS = [
  'openai',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'custom',
  'mock',
] as const

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings') })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Settings> & { api_key?: string }) =>
      api.put<Settings>('/settings', body),
    onSuccess: (s) => qc.setQueryData(['settings'], s),
  })
}

export interface ConnectionResult {
  ok: boolean
  provider?: string
  model?: string | null
  vision_capable: boolean
}

export function useTestConnection() {
  return useMutation({
    mutationFn: () => api.post<ConnectionResult>('/settings/test-connection'),
  })
}

export function useDiagnosticsReport() {
  return useMutation({
    mutationFn: async () => {
      const d = await api.get<Record<string, unknown>>('/system/diagnostics')
      return [
        `TweakCV diagnostics ${String(d.generated_at)}`,
        `version=${d.version} node=${d.node} os=${d.os}`,
        `data_dir=${d.data_dir}`,
        `settings=${JSON.stringify(d.settings)}`,
        `recent_errors=${JSON.stringify(d.recent_errors)}`,
      ].join('\n')
    },
  })
}
