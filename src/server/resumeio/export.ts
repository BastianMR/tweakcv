import type { TailoredCv } from '../../shared/schemas/cv'
import type { ProfileSnapshot } from '../routes/cvs'

/** level 1-5 → escala textual JSON Resume (mapping fijo del contrato) */
const LEVEL_TEXT = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert']

/**
 * Export interno → JSON Resume (contrato json-resume-mapping.md).
 * Assessments NO se exportan. Tags viajan en el bloque x-tweakcv.
 */
export function toJsonResume(
  cv: TailoredCv,
  snapshot: ProfileSnapshot,
  meta: { templateId: string; cvId: string; generatedAt: string },
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    basics: {
      name: cv.header.name,
      ...(cv.header.email && { email: cv.header.email }),
      ...(cv.header.phone && { phone: cv.header.phone }),
      ...(cv.header.city && { location: { city: cv.header.city } }),
      ...(cv.header.website && { website: cv.header.website }),
      ...(cv.header.linkedin && { profiles: [{ network: 'LinkedIn', url: cv.header.linkedin }] }),
      ...(cv.summary && { summary: cv.summary }),
    },
    work: [] as unknown[],
    education: [] as unknown[],
    skills: [] as unknown[],
    languages: [] as unknown[],
    projects: [] as unknown[],
  }

  const tagsByRef: Record<string, string[]> = {}

  for (const section of cv.sections) {
    switch (section.type) {
      case 'experience':
        out.work = section.items.map((e) => {
          const original = snapshot.experiences.find((x) => x.id === e.refId)
          const tags = original?.tags
          if (Array.isArray(tags)) {
            tagsByRef[e.refId] = tags as string[]
          }
          return {
            company: e.company,
            name: e.company,
            position: e.role,
            startDate: e.startDate ?? undefined,
            endDate: e.endDate ?? undefined,
            highlights: e.bullets,
          }
        })
        break
      case 'education':
        out.education = section.items.map((ed) => ({
          institution: ed.institution,
          area: ed.field ?? ed.degree,
          studyType: ed.degree,
          startDate: ed.startDate ?? undefined,
          endDate: ed.endDate ?? undefined,
        }))
        break
      case 'skills':
        out.skills = section.items
          .filter((s) => s.category !== 'language')
          .map((s) => ({
            name: s.name,
            ...(s.level != null && { level: LEVEL_TEXT[s.level - 1] ?? 'Intermediate' }),
          }))
        out.languages = section.items
          .filter((s) => s.category === 'language')
          .map((s) => ({
            language: s.name,
            fluency: s.cefr ? `CEFR ${s.cefr}` : undefined,
          }))
        break
      case 'projects':
        out.projects = section.items.map((p) => ({
          name: p.name,
          description: p.description ?? undefined,
          highlights: p.highlights.length > 0 ? p.highlights : undefined,
          url: p.url ?? undefined,
          keywords: p.tech.length > 0 ? p.tech : undefined,
        }))
        break
    }
  }

  // round-trip sin pérdida: bloque extensión propio fuera del spec estándar
  out['x-tweakcv'] = {
    template_id: meta.templateId,
    cv_id: meta.cvId,
    generated_at: meta.generatedAt,
    experience_tags: Object.entries(tagsByRef)
      .filter(([, tags]) => tags.length > 0)
      .map(([refId, tags]) => ({ ref_id: refId, tags })),
  }

  // limpiar arrays vacíos para no emitir claves nulas
  for (const key of ['work', 'education', 'skills', 'languages', 'projects']) {
    if (Array.isArray(out[key]) && (out[key] as unknown[]).length === 0) delete out[key]
  }
  return out
}
