import { describe, expect, it } from 'vitest'
import {
  contactSchema,
  profileCreateSchema,
} from '../../src/shared/schemas/profile'
import { experienceCreateSchema } from '../../src/shared/schemas/experience'
import { educationCreateSchema } from '../../src/shared/schemas/education'
import { skillCreateSchema } from '../../src/shared/schemas/skill'
import { projectCreateSchema } from '../../src/shared/schemas/project'

describe('profileSchema', () => {
  it('acepta contacto con al menos un medio válido', () => {
    expect(contactSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
    expect(contactSchema.safeParse({ phone: '+541122334455' }).success).toBe(true)
  })
  it('rechaza contacto vacío o email inválido', () => {
    expect(contactSchema.safeParse({}).success).toBe(false)
    expect(contactSchema.safeParse({ email: 'no-es-mail' }).success).toBe(false)
  })
  it('perfil exige name', () => {
    expect(profileCreateSchema.safeParse({ name: 'Dev', contact: { email: 'a@b.co' } }).success).toBe(true)
    expect(profileCreateSchema.safeParse({ contact: { email: 'a@b.co' } }).success).toBe(false)
  })
})

describe('experienceSchema', () => {
  const base = {
    company: 'Acme',
    role: 'Dev',
    start_date: '2020-01',
    achievements: ['hice cosas'],
  }
  it('acepta experiencia válida sin end_date', () => {
    expect(experienceCreateSchema.safeParse(base).success).toBe(true)
  })
  it('end_date >= start_date', () => {
    expect(
      experienceCreateSchema.safeParse({ ...base, end_date: '2019-12' }).success,
    ).toBe(false)
    expect(
      experienceCreateSchema.safeParse({ ...base, end_date: '2021-05' }).success,
    ).toBe(true)
  })
  it('formato YYYY-MM estricto y ≥1 achievement', () => {
    expect(experienceCreateSchema.safeParse({ ...base, start_date: '2020-13' }).success).toBe(false)
    expect(experienceCreateSchema.safeParse({ ...base, start_date: '2020-1' }).success).toBe(false)
    expect(experienceCreateSchema.safeParse({ ...base, achievements: [] }).success).toBe(false)
  })
})

describe('educationSchema', () => {
  it('status restringido', () => {
    expect(
      educationCreateSchema.safeParse({
        institution: 'UBA',
        degree: 'Lic.',
        start_date: '2015-03',
        status: 'completed',
      }).success,
    ).toBe(true)
    expect(
      educationCreateSchema.safeParse({
        institution: 'UBA',
        degree: 'Lic.',
        start_date: '2015-03',
        status: 'abandonada',
      }).success,
    ).toBe(false)
  })
})

describe('skillSchema', () => {
  it('language exige cefr; técnico admite level 1-5', () => {
    expect(skillCreateSchema.safeParse({ name: 'Inglés', category: 'language', cefr: 'C1' }).success).toBe(true)
    expect(skillCreateSchema.safeParse({ name: 'Inglés', category: 'language' }).success).toBe(false)
    expect(skillCreateSchema.safeParse({ name: 'TS', category: 'technical', level: 4 }).success).toBe(true)
    expect(skillCreateSchema.safeParse({ name: 'TS', category: 'technical', level: 9 }).success).toBe(false)
  })
  it('cefr solo valores válidos', () => {
    expect(skillCreateSchema.safeParse({ name: 'X', category: 'soft', cefr: 'Z9' }).success).toBe(false)
  })
})

describe('projectSchema', () => {
  it('exige name; tech/highlights opcionales', () => {
    expect(projectCreateSchema.safeParse({ name: 'Foo' }).success).toBe(true)
    expect(projectCreateSchema.safeParse({}).success).toBe(false)
    expect(
      projectCreateSchema.safeParse({ name: 'Foo', tech: ['ts'], highlights: ['bar'] }).success,
    ).toBe(true)
  })
})
