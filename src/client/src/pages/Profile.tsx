import { useState } from 'react'
import { Navigate } from 'react-router'
import { useT } from '../i18n'
import {
  useActiveProfile,
  useCollection,
  useCreateInColl,
  useDeleteInColl,
  type SkillRow,
} from '../api/queries'
import { ApiClientError } from '../api/client'

const input = 'border px-2 py-1 rounded'
const btn = 'border px-2 py-1 rounded hover:bg-black/5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 text-sm">
      <span className="opacity-70">{label}</span>
      {children}
    </label>
  )
}

function ErrorMsg({ err }: { err: unknown }) {
  if (!err) return null
  const msg = err instanceof ApiClientError ? `${err.code}: ${err.message}` : String(err)
  return <p role="alert" className="text-red-600 text-sm">{msg}</p>
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section data-section={title} className="border rounded p-3 flex flex-col gap-2">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function SkillsSection() {
  const t = useT()
  const skills = useCollection<SkillRow>('skills')
  const create = useCreateInColl<{ name: string; category: string; level?: number; cefr?: string }>('skills')
  const remove = useDeleteInColl('skills')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'technical' | 'soft' | 'language'>('technical')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await create.mutateAsync({
      name: name.trim(),
      category,
      ...(category === 'language'
        ? { cefr: (document.getElementById('cefr') as HTMLSelectElement).value }
        : {}),
    })
    setName('')
  }

  return (
    <Section title="Skills">
      <form onSubmit={submit} className="flex gap-2 items-end flex-wrap">
        <Field label="Name">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category">
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            <option value="technical">technical</option>
            <option value="soft">soft</option>
            <option value="language">language</option>
          </select>
        </Field>
        {category === 'language' ? (
          <Field label="CEFR">
            <select id="cefr" className={input} defaultValue="B2">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Level (1-5)">
            <input id="level" type="number" min={1} max={5} className={input} defaultValue={3} />
          </Field>
        )}
        <button className={btn} disabled={create.isPending}>
          +
        </button>
      </form>
      <ErrorMsg err={create.error ?? skills.error} />
      <ul className="flex flex-wrap gap-1.5">
        {skills.data?.map((s) => (
          <li key={s.id}>
            <span
              data-testid={`skill-badge-${s.category}`}
              className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-sm ${
                s.category === 'language'
                  ? 'bg-blue-500/10'
                  : s.category === 'soft'
                    ? 'bg-green-500/10'
                    : 'bg-amber-500/10'
              }`}
            >
              {s.name}
              {s.cefr ? ` · ${s.cefr}` : s.level != null ? ` · L${s.level}` : ''}
              <button aria-label={`${t('common.delete')} ${s.name}`} onClick={() => remove.mutate(s.id)}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

interface ExperienceRow {
  id: string
  company: string
  role: string
  start_date: string
  end_date: string | null
  achievements: string[]
}

function ExperiencesSection() {
  const experiences = useCollection<ExperienceRow>('experiences')
  const create = useCreateInColl<{ company: string; role: string; start_date: string; achievements: string[] }>(
    'experiences',
  )
  const remove = useDeleteInColl('experiences')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')

  return (
    <Section title="Experiencia">
      <form
        className="flex gap-2 items-end flex-wrap"
        onSubmit={(e) => {
          e.preventDefault()
          if (!company.trim() || !role.trim()) return
          create.mutate(
            { company, role, start_date: '2024-01', achievements: ['·'] },
            { onError: undefined }, // el error se muestra vía create.error abajo
          )
          setCompany('')
          setRole('')
        }}
      >
        <Field label="Company">
          <input className={input} value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
        <Field label="Role">
          <input className={input} value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <button className={btn}>+</button>
      </form>
      <ErrorMsg err={create.error} />
      <ul className="text-sm flex flex-col gap-1">
        {experiences.data?.map((x) => (
          <li key={x.id} className="flex justify-between border-b py-0.5">
            <span>
              <strong>{x.role}</strong> · {x.company} ({x.start_date}→{x.end_date ?? 'present'})
            </span>
            <button onClick={() => remove.mutate(x.id)}>×</button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

interface EducationRow {
  id: string
  institution: string
  degree: string
  start_date: string
}

function EducationSection() {
  const education = useCollection<EducationRow>('education')
  const create = useCreateInColl<{ institution: string; degree: string; start_date: string }>('education')
  const remove = useDeleteInColl('education')
  const [institution, setInstitution] = useState('')
  const [degree, setDegree] = useState('')

  return (
    <Section title="Educación">
      <form
        className="flex gap-2 items-end flex-wrap"
        onSubmit={(e) => {
          e.preventDefault()
          if (!institution.trim() || !degree.trim()) return
          void create.mutateAsync({ institution, degree, start_date: '2020-03' })
          setInstitution('')
          setDegree('')
        }}
      >
        <Field label="Institution">
          <input className={input} value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </Field>
        <Field label="Degree">
          <input className={input} value={degree} onChange={(e) => setDegree(e.target.value)} />
        </Field>
        <button className={btn}>+</button>
      </form>
      <ErrorMsg err={create.error} />
      <ul className="text-sm flex flex-col gap-1">
        {education.data?.map((ed) => (
          <li key={ed.id} className="flex justify-between border-b py-0.5">
            <span>
              <strong>{ed.degree}</strong> · {ed.institution} ({ed.start_date})
            </span>
            <button onClick={() => remove.mutate(ed.id)}>×</button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function ProfilePage() {
  const t = useT()
  const active = useActiveProfile()

  if (active.isLoading) return <p>{t('common.loading')}</p>

  if (active.isError) {
    const err = active.error
    if (err instanceof ApiClientError && err.code === 'no_profile') {
      return <Navigate to="/onboarding" replace />
    }
    return <ErrorMsg err={err} />
  }

  const profile = active.data!.profile

  return (
    <div className="flex flex-col gap-4" data-testid="profile-page">
      <header>
        <h2>{profile.name}</h2>
        {profile.summary && <p className="opacity-70">{profile.summary}</p>}
        <p className="text-sm opacity-60">
          {Object.values(profile.contact ?? {}).filter(Boolean).join(' · ')}
        </p>
      </header>
      <SkillsSection />
      <ExperiencesSection />
      <EducationSection />
    </div>
  )
}
