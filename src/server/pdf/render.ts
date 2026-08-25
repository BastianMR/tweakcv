import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Handlebars from 'handlebars'
import type { TailoredCv, ExperienceItem, EducationItem, SkillItem, ProjectItem } from '../../shared/schemas/cv'

export const TEMPLATE_ID = 'ats-classic-v1'

const templatePath = fileURLToPath(new URL('../../../templates/cv/ats-classic-v1.html.hbs', import.meta.url))
const compiled = Handlebars.compile(readFileSync(templatePath, 'utf8'))

function contactLine(cv: TailoredCv): string {
  return [cv.header.email, cv.header.phone, cv.header.city, cv.header.linkedin, cv.header.website]
    .filter(Boolean)
    .join(' · ')
}

interface FlatView {
  language: string
  header: TailoredCv['header']
  summary?: string | null
  contactLine: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: SkillItem[]
  projects: ProjectItem[]
}

/** aplana sections tipadas a la vista del template */
export function flattenSections(cv: TailoredCv): FlatView {
  const view: FlatView = {
    language: 'es',
    header: cv.header,
    summary: cv.summary ?? null,
    contactLine: contactLine(cv),
    experience: [],
    education: [],
    skills: [],
    projects: [],
  }
  for (const section of cv.sections) {
    switch (section.type) {
      case 'experience':
        view.experience = section.items
        break
      case 'education':
        view.education = section.items
        break
      case 'skills':
        view.skills = section.items
        break
      case 'projects':
        view.projects = section.items
        break
    }
  }
  return view
}

/** HTML fiel para preview iframe y para el PDF */
export function renderHtml(cv: TailoredCv, language: string): string {
  return compiled({ ...flattenSections(cv), language })
}

/** Markdown plano con el mismo contenido (export md del contrato) */
export function renderMarkdown(cv: TailoredCv): string {
  const flat = flattenSections(cv)
  const lines: string[] = [`# ${flat.header.name}`, '', flat.contactLine, '']
  if (flat.summary) lines.push('## Summary', '', flat.summary, '')
  if (flat.experience.length) {
    lines.push('## Experience', '')
    for (const e of flat.experience) {
      lines.push(
        `### ${e.role} — ${e.company}`,
        '',
        `${e.startDate ?? ''}${e.endDate ? ` – ${e.endDate}` : ' – present'}`,
        '',
      )
      for (const b of e.bullets) lines.push(`- ${b}`)
      lines.push('')
    }
  }
  if (flat.education.length) {
    lines.push('## Education', '')
    for (const ed of flat.education) lines.push(`### ${ed.degree}`, `${ed.institution}`, '')
  }
  if (flat.skills.length) {
    lines.push('## Skills', '')
    for (const s of flat.skills) lines.push(`- ${s.name}${s.cefr ? ` (CEFR ${s.cefr})` : ''}`)
    lines.push('')
  }
  if (flat.projects.length) {
    lines.push('## Projects', '')
    for (const p of flat.projects) lines.push(`### ${p.name}`, p.description ?? '', '')
  }
  return lines.join('\n')
}
