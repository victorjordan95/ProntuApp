import { useState, useCallback } from 'react'
import { Entities, VitalValue } from '../types'

const emptyEntities = (): Entities => ({
  symptoms: [],
  medications: [],
  diagnoses: [],
  vitals: [],
})

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.toLowerCase()))]
}

/**
 * Accumulates clinical entities across a consultation.
 * Strings are deduplicated case-insensitively.
 * Vitals are NOT deduplicated — multiple readings in one session are valid.
 */
export function useEntities() {
  const [entities, setEntities] = useState<Entities>(emptyEntities)

  const addEntities = useCallback((incoming: Partial<Entities>) => {
    setEntities(prev => ({
      symptoms:    dedupe([...prev.symptoms,    ...(incoming.symptoms    ?? [])]),
      medications: dedupe([...prev.medications, ...(incoming.medications ?? [])]),
      diagnoses:   dedupe([...prev.diagnoses,   ...(incoming.diagnoses   ?? [])]),
      vitals:      [...prev.vitals,             ...(incoming.vitals      ?? [])],
    }))
  }, [])

  const clearEntities = useCallback(() => setEntities(emptyEntities), [])

  return { entities, addEntities, clearEntities }
}
