import { useNavigate } from 'react-router'
import { useActivateProfile, useProfiles, useActiveProfile } from '../api/queries'
import type { Profile } from '../../../shared/schemas/profile'

export function ProfileSwitcher() {
  const navigate = useNavigate()
  const profiles = useProfiles()
  const active = useActiveProfile()
  const activate = useActivateProfile()

  if (!profiles.data || profiles.data.length === 0) return null

  return (
    <select
      aria-label="active profile"
      data-testid="profile-switcher"
      value={active.data?.profile.id ?? ''}
      onChange={(e) => {
        activate.mutate(e.target.value)
        navigate('/perfil')
      }}
    >
      {profiles.data.map((p: Profile) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
