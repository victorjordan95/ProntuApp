import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEntities } from '../useEntities'

describe('useEntities', () => {
  it('starts with empty entities', () => {
    const { result } = renderHook(() => useEntities())
    expect(result.current.entities.symptoms).toHaveLength(0)
    expect(result.current.entities.medications).toHaveLength(0)
    expect(result.current.entities.diagnoses).toHaveLength(0)
    expect(result.current.entities.vitals).toHaveLength(0)
  })

  it('addEntities accumulates symptoms', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({ symptoms: ['cefaleia'] }))
    act(() => result.current.addEntities({ symptoms: ['tontura'] }))
    expect(result.current.entities.symptoms).toContain('cefaleia')
    expect(result.current.entities.symptoms).toContain('tontura')
  })

  it('deduplicates repeated symptom terms', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({ symptoms: ['cefaleia'] }))
    act(() => result.current.addEntities({ symptoms: ['cefaleia'] }))
    const count = result.current.entities.symptoms.filter(s => s === 'cefaleia').length
    expect(count).toBe(1)
  })

  it('deduplicates case-insensitively', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({ symptoms: ['Cefaleia'] }))
    act(() => result.current.addEntities({ symptoms: ['cefaleia'] }))
    expect(result.current.entities.symptoms).toHaveLength(1)
  })

  it('accumulates medications independently from symptoms', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({ medications: ['losartana'] }))
    expect(result.current.entities.medications).toContain('losartana')
    expect(result.current.entities.symptoms).toHaveLength(0)
  })

  it('accumulates vitals (no deduplication — multiple readings allowed)', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({
      vitals: [{ type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 }],
    }))
    act(() => result.current.addEntities({
      vitals: [{ type: 'pa', raw: '150/95', systolic: 150, diastolic: 95 }],
    }))
    expect(result.current.entities.vitals).toHaveLength(2)
  })

  it('clearEntities resets to empty', () => {
    const { result } = renderHook(() => useEntities())
    act(() => result.current.addEntities({ symptoms: ['cefaleia'], medications: ['losartana'] }))
    act(() => result.current.clearEntities())
    expect(result.current.entities.symptoms).toHaveLength(0)
    expect(result.current.entities.medications).toHaveLength(0)
  })
})
