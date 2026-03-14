import { useCallback } from 'react'
import { Segment, EntityMatch, VitalValue } from '../types'
import { medicalDictionary } from '../lib/medicalDictionary'
import { applyRules } from '../lib/alertRules'
import { useEntities } from './useEntities'

/**
 * NLP pipeline hook — extracts clinical entities from transcript segments.
 *
 * Uses regex + medical dictionary (O(n) per segment).
 * Internally uses useEntities to accumulate results across the consultation.
 *
 * NOTE for fine-tuning: replace extractFromText with a TF.js model call
 * when a pt-BR NER model is available. The processSegment interface stays the same.
 */
export function useNLP() {
  const { entities, addEntities, clearEntities } = useEntities()

  // Extract entity matches and raw entity values from a text string.
  const extractFromText = useCallback((text: string): {
    matches: EntityMatch[]
    symptoms: string[]
    medications: string[]
    diagnoses: string[]
    vitals: VitalValue[]
  } => {
    const lower = text.toLowerCase()
    const matches: EntityMatch[] = []
    const symptoms: string[] = []
    const medications: string[] = []
    const diagnoses: string[] = []
    const vitals: VitalValue[] = []

    // --- String dictionary matching ---
    for (const term of medicalDictionary.sintomas) {
      const idx = lower.indexOf(term)
      if (idx !== -1) {
        matches.push({ text: term, category: 'symptom', start: idx, end: idx + term.length })
        symptoms.push(term)
      }
    }
    for (const term of medicalDictionary.medicamentos) {
      const idx = lower.indexOf(term)
      if (idx !== -1) {
        matches.push({ text: term, category: 'medication', start: idx, end: idx + term.length })
        medications.push(term)
      }
    }
    for (const term of medicalDictionary.diagnosticos) {
      const idx = lower.indexOf(term)
      if (idx !== -1) {
        matches.push({ text: term, category: 'diagnosis', start: idx, end: idx + term.length })
        diagnoses.push(term)
      }
    }

    // --- Regex-based vital extraction ---
    const paMatch = medicalDictionary.valores.pa.exec(text)
    if (paMatch) {
      const systolic  = parseInt(paMatch[1], 10)
      const diastolic = parseInt(paMatch[2], 10)
      vitals.push({ type: 'pa', raw: `${systolic}/${diastolic}`, systolic, diastolic })
      matches.push({
        text: paMatch[0], category: 'vital',
        start: paMatch.index, end: paMatch.index + paMatch[0].length,
      })
    }

    const gliMatch = medicalDictionary.valores.glicemia.exec(text)
    if (gliMatch) {
      const value = parseInt(gliMatch[1], 10)
      vitals.push({ type: 'glicemia', raw: gliMatch[0], value })
      matches.push({
        text: gliMatch[0], category: 'vital',
        start: gliMatch.index, end: gliMatch.index + gliMatch[0].length,
      })
    }

    const pesoMatch = medicalDictionary.valores.peso.exec(text)
    if (pesoMatch) {
      const value = parseFloat(pesoMatch[1].replace(',', '.'))
      vitals.push({ type: 'peso', raw: pesoMatch[0], value })
      matches.push({
        text: pesoMatch[0], category: 'vital',
        start: pesoMatch.index, end: pesoMatch.index + pesoMatch[0].length,
      })
    }

    const fcMatch = medicalDictionary.valores.fc.exec(text)
    if (fcMatch) {
      const value = parseInt(fcMatch[1], 10)
      vitals.push({ type: 'fc', raw: fcMatch[0], value })
      matches.push({
        text: fcMatch[0], category: 'vital',
        start: fcMatch.index, end: fcMatch.index + fcMatch[0].length,
      })
    }

    return { matches, symptoms, medications, diagnoses, vitals }
  }, [])

  /**
   * Process a finalized segment: annotate with entity positions and
   * accumulate entities in state for alert/SOAP generation.
   *
   * IMPORTANT: only call with isFinal === true segments.
   * Interim results cause noise and should be ignored by the caller.
   */
  const processSegment = useCallback((segment: Segment): Segment => {
    const { matches, symptoms, medications, diagnoses, vitals } = extractFromText(segment.text)
    addEntities({ symptoms, medications, diagnoses, vitals })
    return { ...segment, entities: matches }
  }, [extractFromText, addEntities])

  const alerts = applyRules(entities)

  return { entities, alerts, processSegment, clearEntities }
}
