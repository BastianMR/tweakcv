import { useState } from 'react'
import { useT } from '../i18n'
import {
  PROVIDER_PRESETS,
  useDiagnosticsReport,
  useSaveSettings,
  useSettings,
  useTestConnection,
} from '../api/settings'
import type { Settings } from '../api/settings'

const input = 'border rounded px-2 py-1 w-full'
const btn = 'border rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 text-sm">
      <span className="opacity-70">{label}</span>
      {children}
    </label>
  )
}

export function SettingsPage() {
  const t = useT()
  const settings = useSettings()
  const save = useSaveSettings()
  const testConn = useTestConnection()
  const diagnostics = useDiagnosticsReport()

  const [provider, setProvider] = useState<string>('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [copiedFlash, setCopiedFlash] = useState(false)

  if (settings.isLoading) return <p>{t('common.loading')}</p>
  const s: Settings | undefined = settings.data
  const currentProvider = provider || s?.provider_preset || 'mock'

  function payload(): Partial<Settings> & { api_key?: string } {
    return {
      ...(provider && { provider_preset: provider as Settings['provider_preset'] }),
      base_url: baseUrl.trim() === '' ? null : baseUrl.trim(),
      model: model.trim() === '' ? null : model.trim(),
      ...(apiKey.trim() && { api_key: apiKey.trim() }),
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(await diagnostics.mutateAsync())
    setCopiedFlash(true)
    setTimeout(() => setCopiedFlash(false), 2500)
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl" data-testid="settings-page">
      <h2>{t('settings.title')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('settings.provider')}>
          <select className={input} value={currentProvider} onChange={(e) => setProvider(e.target.value)}>
            {PROVIDER_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.model')}>
          <input
            className={input}
            placeholder="gpt-4o-mini / llama-3.1-70b…"
            defaultValue={s?.model ?? ''}
            onChange={(e) => setModel(e.target.value)}
          />
        </Field>
        <Field label={t('settings.baseUrl')}>
          <input
            className={input}
            placeholder="https://api.openai.com/v1"
            disabled={currentProvider !== 'custom'}
            defaultValue={s?.base_url ?? ''}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </Field>
        <Field label={t('settings.apiKey')}>
          <input
            type="password"
            className={input}
            placeholder={t('settings.apiKeyKeep')}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <button
          className={`${btn} font-semibold`}
          data-testid="save-settings"
          onClick={() =>
            save.mutate(payload(), {
              onSuccess: () => {
                setApiKey('')
                setSavedFlash(true)
                setTimeout(() => setSavedFlash(false), 2500)
              },
            })
          }
          disabled={save.isPending}
        >
          {t('common.save')}
        </button>
        <button
          className={btn}
          data-testid="test-connection-btn"
          onClick={() => testConn.mutate()}
          disabled={testConn.isPending}
        >
          {t('settings.testConnection')}
        </button>
        <button className={btn} onClick={() => void copyReport()} disabled={diagnostics.isPending}>
          {t('settings.copyReport')}
        </button>
      </div>

      {savedFlash && <p className="text-green-700 text-sm">{t('settings.saved')}</p>}
      {copiedFlash && (
        <p className="text-green-700 text-sm" data-testid="report-copied">
          {t('settings.copied')}
        </p>
      )}

      {testConn.data && (
        <p
          className={`text-sm ${testConn.data.ok ? 'text-green-700' : 'text-red-600'}`}
          data-testid="connection-result"
        >
          {testConn.data.ok ? t('settings.connectionOk') : t('settings.connectionFail')}
          {testConn.data.vision_capable ? '' : ` · ⚠ ${t('settings.visionWarning')}`}
        </p>
      )}
      {!testConn.data && s && !s.vision_capable && s.provider_preset !== 'mock' && (
        <p role="alert" className="text-amber-600 text-sm">
          ⚠ {t('settings.visionWarning')}
        </p>
      )}
      {(save.error || settings.error) && (
        <p role="alert" className="text-red-600 text-sm">
          {String(save.error ?? settings.error)}
        </p>
      )}
    </div>
  )
}
