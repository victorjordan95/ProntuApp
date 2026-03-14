import { describe, it, expect } from 'vitest'
import { buildSOAP } from '../soapBuilder'
import { Entities, Segment } from '../../types'

const empty = (): Entities => ({
  symptoms: [], medications: [], diagnoses: [], vitals: [],
})

describe('buildSOAP', () => {
  it('returns empty strings when entities are empty', () => {
    const soap = buildSOAP(empty(), [])
    expect(soap.s).toBe('')
    expect(soap.o).toBe('')
    expect(soap.a).toBe('')
    expect(soap.p).toBe('')
  })

  it('S — includes patient symptoms', () => {
    const soap = buildSOAP({ ...empty(), symptoms: ['dor no peito', 'dispneia'] }, [])
    expect(soap.s).toContain('dor no peito')
    expect(soap.s).toContain('dispneia')
  })

  it('O — includes PA vital', () => {
    const entities: Entities = {
      ...empty(),
      vitals: [{ type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 }],
    }
    const soap = buildSOAP(entities, [])
    expect(soap.o).toContain('PA: 145/90')
  })

  it('O — includes glicemia vital', () => {
    const entities: Entities = {
      ...empty(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 250', value: 250 }],
    }
    const soap = buildSOAP(entities, [])
    expect(soap.o).toContain('250')
  })

  it('A — includes diagnoses', () => {
    const soap = buildSOAP({ ...empty(), diagnoses: ['hipertensão', 'diabetes'] }, [])
    expect(soap.a).toContain('hipertensão')
    expect(soap.a).toContain('diabetes')
  })

  it('P — includes medications', () => {
    const soap = buildSOAP({ ...empty(), medications: ['losartana', 'metformina'] }, [])
    expect(soap.p).toContain('losartana')
    expect(soap.p).toContain('metformina')
  })
})
