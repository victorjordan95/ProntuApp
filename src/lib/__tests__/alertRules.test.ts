import { describe, it, expect } from 'vitest'
import { applyRules } from '../alertRules'
import { Entities } from '../../types'

const emptyEntities = (): Entities => ({
  symptoms: [], medications: [], diagnoses: [], vitals: [],
})

describe('applyRules', () => {
  it('returns no alerts for normal values', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '115/75', systolic: 115, diastolic: 75 }],
    }
    expect(applyRules(entities)).toHaveLength(0)
  })

  it('PA 145/90 → aviso Hipertensão Estágio 1', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 }],
    }
    const alerts = applyRules(entities)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('aviso')
    expect(alerts[0].message).toBe('Hipertensão Estágio 1')
  })

  it('PA 185/110 → crítico Crise hipertensiva', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '185/110', systolic: 185, diastolic: 110 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('critico')
    expect(alerts[0].message).toBe('Crise hipertensiva')
  })

  it('PA 125/80 → info Pré-hipertensão', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '125/80', systolic: 125, diastolic: 80 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('info')
    expect(alerts[0].message).toBe('Pré-hipertensão')
  })

  it('glicemia 250 → aviso Hiperglicemia', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 250', value: 250 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('aviso')
    expect(alerts[0].message).toBe('Hiperglicemia')
  })

  it('glicemia 310 → crítico Hiperglicemia grave', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 310', value: 310 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('critico')
    expect(alerts[0].message).toBe('Hiperglicemia grave')
  })

  it('dor no peito → info protocolo cardíaco', () => {
    const entities: Entities = {
      ...emptyEntities(),
      symptoms: ['dor no peito'],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].message).toContain('protocolo cardíaco')
    expect(alerts[0].severity).toBe('info')
  })

  it('dor precordial → info protocolo cardíaco', () => {
    const entities: Entities = {
      ...emptyEntities(),
      symptoms: ['dor precordial'],
    }
    const alerts = applyRules(entities)
    expect(alerts.some(a => a.message.includes('protocolo cardíaco'))).toBe(true)
  })

  it('each alert has a unique id', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [
        { type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 },
        { type: 'glicemia', raw: 'glicemia 250', value: 250 },
      ],
      symptoms: ['dor no peito'],
    }
    const alerts = applyRules(entities)
    const ids = alerts.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
