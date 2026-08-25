import { describe, expect, it } from 'vitest'
import {
  checkKeywordCoverage,
  checkStandardHeadings,
  checkOneColumn,
  checkContactDensity,
  checkLength,
  evaluateMechanical,
} from '../../src/server/ats/engine'
import type { TailoredCv } from '../../src/shared/schemas/cv'

const baseCv: TailoredCv = {
  header: { name: 'Basma', email: 'b@d.co', phone: '+5411', city: 'Buenos Aires' },
  summary:
    'Backend developer con TypeScript y PostgreSQL en producción. Experiencia diseñando API REST escalables, migraciones sin downtime y observabilidad con métricas claras.',
  sections: [
    {
      type: 'experience',
      items: [
        {
          refId: 'e1',
          company: 'Acme',
          role: 'Backend Developer',
          startDate: '2022-01',
          endDate: null,
          location: 'Buenos Aires',
          bullets: [
            'Diseñó API REST con Node.js y PostgreSQL sirviendo millones de requests',
            'Migró servicios legacy a TypeScript reduciendo bugs en producción',
            'Implementó tests de integración y pipeline CI con cobertura obligatoria',
            'Documentó arquitectura y onboarding del equipo',
            'Optimizó queries lentas agregando índices y caching estratégico',
            'Lideró la adopción de code review y estándares de estilo',
          ],
        },
      ],
    },
    {
      type: 'skills',
      items: [
        { refId: 's1', name: 'TypeScript', category: 'technical', level: 4 },
        { refId: 's2', name: 'Node.js', category: 'technical', level: 4 },
        { refId: 's3', name: 'PostgreSQL', category: 'technical', level: 3 },
        { refId: 's4', name: 'Inglés', category: 'language', cefr: 'C1' },
      ],
    },
    {
      type: 'projects',
      items: [
        {
          refId: 'p1',
          name: 'Payments Platform',
          description: 'Plataforma de pagos con idempotencia garantizada',
          tech: ['typescript', 'postgresql'],
          highlights: ['Redujo latencia p99 un 30%'],
        },
      ],
    },
    {
      type: 'education',
      items: [{ refId: 'ed1', institution: 'UBA', degree: 'Ing. Informática' }],
    },
  ],
  omittedRefs: [],
}

const posting = {
  title: 'Backend Dev',
  company: 'X',
  language: 'es',
  hardRequirements: ['3 años experiencia'],
  niceToHave: [],
  keywords: ['typescript', 'postgresql', 'docker', 'kubernetes'],
}

describe('checkKeywordCoverage', () => {
  it('clasifica presente/parcial/faltante con evidencia', () => {
    const check = checkKeywordCoverage(baseCv, posting.keywords)
    expect(check.status).toBe('partial')

    const byKeyword = Object.fromEntries(
      (check.evidence ?? []).map((e) => [e.split(':')[0]!, e]),
    )
    // typescript y postgresql aparecen literalmente
    expect(byKeyword['typescript']).toContain('present')
    expect(byKeyword['postgresql']).toContain('present')
    // docker/kubernetes ausentes
    expect(byKeyword['docker']).toContain('missing')
    expect(byKeyword['kubernetes']).toContain('missing')
    expect(check.score).toBeGreaterThan(0)
    expect(check.score).toBeLessThan(1)
  })

  it('cobertura completa → pass', () => {
    const check = checkKeywordCoverage(baseCv, ['typescript', 'postgresql'])
    expect(check.status).toBe('pass')
    expect(check.score).toBe(1)
  })

  it('sin keywords → n/a con score 1', () => {
    const check = checkKeywordCoverage(baseCv, [])
    expect(check.status).toBe('pass')
    expect(check.score).toBe(1)
  })
})

describe('checkStandardHeadings', () => {
  it('reconoce headings canónicos presentes', () => {
    const check = checkStandardHeadings(baseCv)
    expect(check.status).toBe('pass')
  })

  it('CV sin secciones estándar → fail', () => {
    const empty: TailoredCv = { ...baseCv, sections: [] }
    expect(checkStandardHeadings(empty).status).toBe('fail')
  })
})

describe('checkOneColumn (por markup)', () => {
  it('HTML de una columna sin patrones multicolumna → pass', () => {
    const html = '<body><section id="experience"><ul><li>x</li></ul></section></body>'
    expect(checkOneColumn(html).status).toBe('pass')
  })

  it('detecta CSS multicolumna/grid/flex-row como sospechoso', () => {
    const html = '<style>.row{display:flex;flex-direction:row}</style><div class="row"></div>'
    expect(checkOneColumn(html).status).not.toBe('pass')
  })
})

describe('checkContactDensity', () => {
  it('≥2 canales de contacto → pass', () => {
    expect(checkContactDensity(baseCv).status).toBe('pass')
  })
  it('sin contactos → fail', () => {
    const noContact: TailoredCv = { ...baseCv, header: { name: 'Basma' } }
    expect(checkContactDensity(noContact).status).toBe('fail')
  })
})

describe('checkLength', () => {
  it('CV razonable → pass', () => {
    expect(checkLength(baseCv).status).toBe('pass')
  })
  it('demasiado corto → fail', () => {
    const tiny: TailoredCv = {
      header: { name: 'x' },
      sections: [{ type: 'skills', items: [{ refId: 'a', name: 'go', category: 'technical' }] }],
      omittedRefs: [],
    }
    expect(checkLength(tiny).status).toBe('fail')
  })
})

describe('evaluateMechanical', () => {
  it('agrega checks con puntaje 0-100', () => {
    const result = evaluateMechanical(baseCv, posting.keywords, '<html><h1>ok</h1></html>')
    expect(result.checks.length).toBeGreaterThanOrEqual(4)
    expect(result.mechanicalScore).toBeGreaterThan(40)
    expect(result.mechanicalScore).toBeLessThanOrEqual(100)
    // cada check trae id/label/status/score
    for (const c of result.checks) {
      expect(c.id).toBeTruthy()
      expect(['pass', 'partial', 'fail', 'na']).toContain(c.status)
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(1)
    }
  })
})
