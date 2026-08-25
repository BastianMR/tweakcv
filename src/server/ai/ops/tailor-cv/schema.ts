import { tailoredCvSchema } from '../../../../shared/schemas/cv'
import type { TailoredCv } from '../../../../shared/schemas/cv'

export const tailorCvOutputSchema = tailoredCvSchema
export type TailorCvOutput = TailoredCv

interface SnapshotSkill {
  id: string
  name: string
  category: string
  level: number | null
  cefr: string | null
}

/**
 * Fixture determinista del preset mock: construye el CV DIRECTO del snapshot
 * sin IA. Garantiza SC-005 (regeneración byte-idéntica con mismo snapshot) y
 * las reglas anti-invención por construcción (solo copia datos existentes).
 */
export function mockTailorFromSnapshot(
  snapshot: {
    profile: { name?: unknown; contact?: Record<string, unknown>; summary?: unknown }
    experiences?: Array<Record<string, unknown>>
    education?: Array<Record<string, unknown>>
    skills?: SnapshotSkill[]
    projects?: Array<Record<string, unknown>>
  },
  language: string,
): TailoredCv {
  const omitted: Array<{ coll: string; id: string; reason: string }> = []
  const contact = snapshot.profile.contact ?? {}

  const experiences = (snapshot.experiences ?? []).flatMap((e) => {
    const bullets = e.achievements
    if (!Array.isArray(bullets) || bullets.length === 0) {
      omitted.push({ coll: 'experiences', id: String(e.id), reason: 'sin achievements' })
      return []
    }
    return [
      {
        refId: String(e.id),
        company: String(e.company),
        role: String(e.role),
        location: (e.location as string | null) ?? null,
        startDate: (e.start_date as string) ?? null,
        endDate: (e.end_date as string) ?? null,
        bullets: bullets.map(String),
      },
    ]
  })

  const education = (snapshot.education ?? []).map((ed) => ({
    refId: String(ed.id),
    institution: String(ed.institution),
    degree: String(ed.degree),
    field: (ed.field as string | null) ?? null,
    startDate: (ed.start_date as string) ?? null,
    endDate: (ed.end_date as string) ?? null,
  }))

  const skills = (snapshot.skills ?? []).flatMap((s) => {
    if (!s.name) {
      omitted.push({ coll: 'skills', id: s.id, reason: 'sin nombre' })
      return []
    }
    return [
      {
        refId: s.id,
        name: s.name,
        category: s.category as 'technical' | 'soft' | 'language',
        level: s.level,
        cefr: s.cefr,
      },
    ]
  })

  const projects = (snapshot.projects ?? []).map((p) => ({
    refId: String(p.id),
    name: String(p.name),
    description: (p.description as string | null) ?? null,
    tech: Array.isArray(p.tech) ? p.tech.map(String) : [],
    highlights: Array.isArray(p.highlights) ? p.highlights.map(String) : [],
    url: (p.url as string | null) ?? null,
  }))

  return tailorCvOutputSchema.parse({
    header: {
      name: String(snapshot.profile.name ?? 'Sin nombre'),
      email: (contact.email as string | undefined) ?? null,
      phone: (contact.phone as string | undefined) ?? null,
      city: (contact.city as string | undefined) ?? null,
      website: (contact.website as string | undefined) ?? null,
      linkedin: (contact.linkedin as string | undefined) ?? null,
    },
    summary: (snapshot.profile.summary as string | undefined) ?? null,
    sections: [
      { type: 'experience', items: experiences },
      { type: 'education', items: education },
      { type: 'skills', items: skills },
      { type: 'projects', items: projects },
    ].filter((s) => s.items.length > 0),
    omittedRefs: omitted,
    rationale: `CV generado por proveedor mock en ${language}: datos del perfil copiados sin alteración.`,
  })
}
