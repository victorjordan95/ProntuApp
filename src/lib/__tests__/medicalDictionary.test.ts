import { describe, it, expect } from 'vitest'
import { medicalDictionary } from '../medicalDictionary'

describe('medicalDictionary', () => {
  it('contains sintomas array with common symptoms', () => {
    expect(medicalDictionary.sintomas).toContain('dor no peito')
    expect(medicalDictionary.sintomas).toContain('dispneia')
    expect(medicalDictionary.sintomas).toContain('tontura')
  })

  it('contains medicamentos array with common medications', () => {
    expect(medicalDictionary.medicamentos).toContain('losartana')
    expect(medicalDictionary.medicamentos).toContain('metformina')
  })

  it('contains diagnosticos array with common diagnoses', () => {
    expect(medicalDictionary.diagnosticos).toContain('hipertensão')
    expect(medicalDictionary.diagnosticos).toContain('diabetes')
  })

  it('PA regex matches "pressão 145/90"', () => {
    expect(medicalDictionary.valores.pa.test('pressão 145/90')).toBe(true)
  })

  it('PA regex matches "PA 145x90"', () => {
    expect(medicalDictionary.valores.pa.test('PA 145x90')).toBe(true)
  })

  it('glicemia regex matches "glicemia 250"', () => {
    expect(medicalDictionary.valores.glicemia.test('glicemia 250')).toBe(true)
  })

  it('peso regex matches "peso 78 kg"', () => {
    expect(medicalDictionary.valores.peso.test('peso 78 kg')).toBe(true)
  })

  it('fc regex matches "frequência cardíaca 80 bpm"', () => {
    expect(medicalDictionary.valores.fc.test('frequência cardíaca 80 bpm')).toBe(true)
  })
})
