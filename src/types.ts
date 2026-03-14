export type Speaker = 'doctor' | 'patient'
export type EntityCategory = 'symptom' | 'medication' | 'diagnosis' | 'vital'
export type AlertSeverity = 'info' | 'aviso' | 'critico'
export type ConsultaStatus = 'idle' | 'recording' | 'paused' | 'ended'

export interface EntityMatch {
  text: string
  category: EntityCategory
  start: number
  end: number
}

export interface Segment {
  id: string
  speaker: Speaker
  text: string
  timestamp: number // seconds from consultation start
  isFinal: boolean
  entities: EntityMatch[]
}

export interface VitalValue {
  type: 'pa' | 'glicemia' | 'peso' | 'fc'
  raw: string
  systolic?: number   // PA only
  diastolic?: number  // PA only
  value?: number      // single numeric values
}

export interface Entities {
  symptoms: string[]
  medications: string[]
  diagnoses: string[]
  vitals: VitalValue[]
}

export interface Alert {
  id: string
  severity: AlertSeverity
  message: string
  detail?: string
}

export interface SOAPDraft {
  s: string // Subjetivo — patient symptoms
  o: string // Objetivo  — clinical measurements
  a: string // Avaliação  — diagnoses
  p: string // Plano      — medications + plan
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}
