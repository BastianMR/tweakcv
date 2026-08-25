import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useT } from '../i18n'
import { useCreateProfile } from '../api/queries'
import { ApiClientError } from '../api/client'

export function OnboardingPage() {
  const t = useT()
  const navigate = useNavigate()
  const createProfile = useCreateProfile()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createProfile.mutateAsync({
      name: name.trim(),
      ...(email.trim() && { contact: { email: email.trim() } }),
    })
    navigate('/perfil')
  }

  return (
    <div className="flex flex-col gap-3 max-w-sm" data-testid="onboarding">
      <h2>{t('onboarding.welcome')}</h2>
      <p className="opacity-70">{t('onboarding.createFirst')}</p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          aria-label={t('nav.profile')}
          placeholder="Nombre del perfil"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="email (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {createProfile.error instanceof ApiClientError && (
          <p role="alert" className="text-red-600 text-sm">
            {createProfile.error.message}
          </p>
        )}
        <button disabled={createProfile.isPending}>{t('common.save')}</button>
      </form>
    </div>
  )
}
