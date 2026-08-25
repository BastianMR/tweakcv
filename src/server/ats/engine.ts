/**
 * Motor ATS mecánico (determinista, SIN IA — contrato ai-prompts.md).
 * Cobertura keywords con evidencia · headings estándar · una columna (markup) ·
 * longitud · densidad de contacto. Funciones puras testeables.
 */
import type { TailoredCv } from '../../shared/schemas/cv'

export type CheckStatus = 'pass' | 'partial' | 'fail' | 'na'

export interface AtsCheck {
  id: string
  label: string
  status: CheckStatus
  /** 0..1 */
  score: number
  detail?: string
  evidence?: string[]
}

export interface AtsResult {
  checks: AtsCheck[]
  mechanicalScore: number
}

const SECTION_HEADING_IDS = ['experience', 'education', 'skills', 'projects'] as const

function cvText(cv: TailoredCv): string {
  const parts: string[] = [cv.summary ?? '', cv.header.name]
  for (const s of cv.sections) {
    for (const item of s.items as Array<Record<string, unknown>>) {
      for (const v of Object.values(item)) {
        if (typeof v === 'string') parts.push(v)
        else if (Array.isArray(v)) parts.push(v.filter((x) => typeof x === 'string').join(' '))
      }
    }
  }
  return parts.join(' \n ').toLowerCase()
}

/** keywords presente/parcial/faltante con evidencia de dónde apareció */
export function checkKeywordCoverage(cv: TailoredCv, keywords: string[]): AtsCheck {
  if (keywords.length === 0) {
    return { id: 'keywords', label: 'Cobertura de keywords', status: 'pass', score: 1, detail: 'sin posting asociado' }
  }
  const text = cvText(cv)
  let covered = 0
  const evidence = keywords.map((kw) => {
    const needle = kw.toLowerCase().trim()
    if (!needle) return `${kw}: missing`
    const idx = text.indexOf(needle)
    if (idx >= 0) {
      covered++
      // evidencia textual: recorte alrededor del match
      const snippet = text.slice(Math.max(0, idx - 24), idx + needle.length + 24).replace(/\s+/g, ' ')
      return `${kw}: present — “…${snippet}…”`
    }
    // parcial: todas las palabras del keyword presentes por separado
    const words = needle.split(/[\s/]+/).filter(Boolean)
    const allWords = words.length > 1 && words.every((w) => text.includes(w))
    if (allWords) {
      covered += 0.5
      return `${kw}: partial — palabras presentes por separado`
    }
    return `${kw}: missing`
  })

  const score = covered / keywords.length
  return {
    id: 'keywords',
    label: 'Cobertura de keywords',
    status: score >= 0.99 ? 'pass' : score >= 0.5 ? 'partial' : 'fail',
    score,
    evidence,
  }
}

/** headings estándar reconocidos: ≥3 secciones canónicas */
export function checkStandardHeadings(cv: TailoredCv): AtsCheck {
  const present = new Set(cv.sections.map((s) => s.type))
  const found = SECTION_HEADING_IDS.filter((id) => present.has(id))
  const score = found.length / SECTION_HEADING_IDS.length
  return {
    id: 'headings',
    label: 'Encabezados estándar',
    status: found.length >= 3 ? 'pass' : found.length >= 2 ? 'partial' : 'fail',
    score,
    detail: `secciones: ${found.join(', ') || 'ninguna'}`,
  }
}

/** una columna: analiza el markup renderizado buscando patrones multicolumna */
export function checkOneColumn(html: string): AtsCheck {
  const suspicious = [
    /display\s*:\s*flex[\s\S]{0,40}flex-direction\s*:\s*row/i,
    /display\s*:\s*grid/i,
    /<table[^>]*(?:layout|column)/i,
    /columns?\s*:\s*\d/i,
    /float\s*:\s*(left|right)[\s\S]{0,200}float\s*:\s*(left|right)/i,
  ]
  const violations = suspicious.filter((re) => re.test(html))
  return {
    id: 'one_column',
    label: 'Una columna',
    status: violations.length === 0 ? 'pass' : 'fail',
    score: violations.length === 0 ? 1 : 0,
    ...(violations.length > 0 && { detail: 'posible layout multicolumna en el markup' }),
  }
}

/** densidad de contacto: canales en el header */
export function checkContactDensity(cv: TailoredCv): AtsCheck {
  const channels = [cv.header.email, cv.header.phone, cv.header.city, cv.header.linkedin, cv.header.website].filter(
    Boolean,
  ).length
  return {
    id: 'contact',
    label: 'Densidad de contacto',
    status: channels >= 2 ? 'pass' : channels === 1 ? 'partial' : 'fail',
    score: channels >= 2 ? 1 : channels === 1 ? 0.5 : 0,
    detail: `${channels} canal(es)`,
  }
}

/** longitud razonable del CV (120–800 palabras) */
export function checkLength(cv: TailoredCv): AtsCheck {
  const words = cvText(cv).split(/\s+/).filter(Boolean).length
  const status: CheckStatus = words < 60 ? 'fail' : words < 100 ? 'partial' : words <= 800 ? 'pass' : 'partial'
  const score = status === 'pass' ? 1 : status === 'partial' ? 0.5 : 0
  return { id: 'length', label: 'Longitud', status, score, detail: `${words} palabras` }
}

export function evaluateMechanical(cv: TailoredCv, keywords: string[], html: string): AtsResult {
  const checks = [
    checkKeywordCoverage(cv, keywords),
    checkStandardHeadings(cv),
    checkOneColumn(html),
    checkContactDensity(cv),
    checkLength(cv),
  ]
  const applicable = checks.filter((c) => c.status !== 'na')
  const mechanicalScore = Math.round(
    (applicable.reduce((sum, c) => sum + c.score, 0) / applicable.length) * 100,
  )
  return { checks, mechanicalScore }
}
