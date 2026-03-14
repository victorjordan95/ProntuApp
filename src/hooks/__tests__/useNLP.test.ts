import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNLP } from '../useNLP'
import { Segment } from '../../types'

function makeSegment(text: string, speaker: Segment['speaker'] = 'patient'): Segment {
  return {
    id: 'seg-1',
    speaker,
    text,
    timestamp: 5,
    isFinal: true,
    entities: [],
  }
}

describe('useNLP', () => {
  it('starts with empty entities and no alerts', () => {
    const { result } = renderHook(() => useNLP())
    expect(result.current.entities.symptoms).toHaveLength(0)
    expect(result.current.alerts).toHaveLength(0)
  })

  it('processSegment annotates segment with entity matches', () => {
    const { result } = renderHook(() => useNLP())
    let annotated!: Segment
    act(() => {
      annotated = result.current.processSegment(makeSegment('paciente com dor no peito'))
    })
    expect(annotated.entities.some(e => e.category === 'symptom')).toBe(true)
    expect(annotated.entities.some(e => e.text === 'dor no peito')).toBe(true)
  })

  it('processSegment accumulates entities in state', () => {
    const { result } = renderHook(() => useNLP())
    act(() => {
      result.current.processSegment(makeSegment('paciente com dor no peito'))
    })
    expect(result.current.entities.symptoms).toContain('dor no peito')
  })

  it('processSegment extracts medication', () => {
    const { result } = renderHook(() => useNLP())
    act(() => {
      result.current.processSegment(makeSegment('vou prescrever losartana'))
    })
    expect(result.current.entities.medications).toContain('losartana')
  })

  it('processSegment extracts PA vital', () => {
    const { result } = renderHook(() => useNLP())
    act(() => {
      result.current.processSegment(makeSegment('pressão 145/90'))
    })
    expect(result.current.entities.vitals.some(v => v.type === 'pa')).toBe(true)
    expect(result.current.entities.vitals[0].systolic).toBe(145)
  })

  it('generates alert after high PA is extracted', () => {
    const { result } = renderHook(() => useNLP())
    act(() => {
      result.current.processSegment(makeSegment('pressão 185/110'))
    })
    expect(result.current.alerts.some(a => a.message === 'Crise hipertensiva')).toBe(true)
  })

  it('entity match positions are correct', () => {
    const { result } = renderHook(() => useNLP())
    const text = 'paciente com tontura'
    let annotated!: Segment
    act(() => {
      annotated = result.current.processSegment(makeSegment(text))
    })
    const match = annotated.entities.find(e => e.text === 'tontura')
    expect(match).toBeDefined()
    expect(text.substring(match!.start, match!.end)).toBe('tontura')
  })

  it('clearEntities resets state', () => {
    const { result } = renderHook(() => useNLP())
    act(() => {
      result.current.processSegment(makeSegment('dor no peito'))
    })
    act(() => result.current.clearEntities())
    expect(result.current.entities.symptoms).toHaveLength(0)
    expect(result.current.alerts).toHaveLength(0)
  })
})
