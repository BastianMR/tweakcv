/** Catálogo FR-011: assessments recomendados con links oficiales */
export interface AssessmentCatalogEntry {
  type: 'kolbe' | 'cliftonstrengths' | '16personalities' | 'disc' | 'mbti' | 'other'
  label: string
  url: string
}

export const ASSESSMENT_CATALOG: AssessmentCatalogEntry[] = [
  { type: 'kolbe', label: 'Kolbe A™ Index', url: 'https://www.kolbe.com/' },
  { type: 'cliftonstrengths', label: 'CliftonStrengths® (Gallup)', url: 'https://www.gallup.com/cliftonstrengths' },
  { type: '16personalities', label: '16Personalities', url: 'https://www.16personalities.com/es' },
  { type: 'disc', label: 'DISC Assessment', url: 'https://www.discprofile.com/' },
  { type: 'mbti', label: 'Myers-Briggs (MBTI®)', url: 'https://www.myersbriggs.org/' },
]
