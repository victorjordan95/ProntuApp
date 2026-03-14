import { Entities, Segment, SOAPDraft } from '../types'

/**
 * Builds a SOAP draft from accumulated entities and transcript segments.
 * Pure function — call it whenever entities or segments change.
 *
 * NOTE for fine-tuning: each section maps to a specific entity category.
 * S → patient-reported symptoms
 * O → objective clinical values (vitals)
 * A → assessment/diagnoses
 * P → plan (medications)
 */
export function buildSOAP(entities: Entities, _segments: Segment[]): SOAPDraft {
  // S — Subjetivo
  const s = entities.symptoms.length > 0
    ? `Paciente relata: ${entities.symptoms.join(', ')}.`
    : ''

  // O — Objetivo
  const oLines = entities.vitals.map(v => {
    if (v.type === 'pa')       return `PA: ${v.raw} mmHg`
    if (v.type === 'glicemia') return `Glicemia: ${v.value} mg/dL`
    if (v.type === 'peso')     return `Peso: ${v.value} kg`
    if (v.type === 'fc')       return `FC: ${v.value} bpm`
    return ''
  }).filter(Boolean)
  const o = oLines.join('\n')

  // A — Avaliação
  const a = entities.diagnoses.length > 0
    ? entities.diagnoses.join(', ') + '.'
    : ''

  // P — Plano
  const p = entities.medications.length > 0
    ? `Medicamentos: ${entities.medications.join(', ')}.`
    : ''

  return { s, o, a, p }
}
