import { describe, it, expect } from 'vitest'
import { buildChecklist } from '../checklistRules'
import { Entities } from '../../types'

const empty = (): Entities => ({
  symptoms: [], medications: [], diagnoses: [], vitals: [],
})

describe('buildChecklist', () => {
  it('returns empty list when no relevant entities', () => {
    expect(buildChecklist(empty())).toHaveLength(0)
  })

  it('dor precordial → Solicitar ECG', () => {
    const items = buildChecklist({ ...empty(), symptoms: ['dor precordial'] })
    expect(items.some(i => i.text === 'Solicitar ECG')).toBe(true)
  })

  it('dor no peito → Solicitar ECG', () => {
    const items = buildChecklist({ ...empty(), symptoms: ['dor no peito'] })
    expect(items.some(i => i.text === 'Solicitar ECG')).toBe(true)
  })

  it('diabetes → Verificar glicemia em jejum', () => {
    const items = buildChecklist({ ...empty(), diagnoses: ['diabetes'] })
    expect(items.some(i => i.text === 'Verificar glicemia em jejum')).toBe(true)
  })

  it('dm2 → Verificar glicemia em jejum', () => {
    const items = buildChecklist({ ...empty(), diagnoses: ['dm2'] })
    expect(items.some(i => i.text === 'Verificar glicemia em jejum')).toBe(true)
  })

  it('hipertensão → Orientar dieta hipossódica', () => {
    const items = buildChecklist({ ...empty(), diagnoses: ['hipertensão'] })
    expect(items.some(i => i.text === 'Orientar dieta hipossódica')).toBe(true)
  })

  it('medication present → Confirmar posologia', () => {
    const items = buildChecklist({ ...empty(), medications: ['losartana'] })
    expect(items.some(i => i.text === 'Confirmar posologia com o paciente')).toBe(true)
  })

  it('all items start as not done', () => {
    const items = buildChecklist({
      ...empty(),
      symptoms: ['dor no peito'],
      diagnoses: ['diabetes'],
    })
    expect(items.every(i => i.done === false)).toBe(true)
  })

  it('each item has a unique id', () => {
    const items = buildChecklist({
      ...empty(),
      symptoms: ['dor no peito'],
      diagnoses: ['diabetes', 'hipertensão'],
      medications: ['losartana'],
    })
    const ids = items.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
