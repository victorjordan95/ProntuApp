import { Entities, Alert } from '../types'

/**
 * Applies clinical alert rules to extracted entities.
 * Returns a list of alerts sorted by severity (critico first).
 *
 * NOTE for fine-tuning: add new rules here as the dictionary grows.
 * Each rule should be a pure function with no side effects.
 */
export function applyRules(entities: Entities): Alert[] {
  const alerts: Alert[] = []
  let counter = 0
  const nextId = () => `alert-${++counter}-${Date.now()}`

  // --- Pressure rules ---
  for (const vital of entities.vitals) {
    if (vital.type === 'pa' && vital.systolic !== undefined) {
      if (vital.systolic >= 180) {
        alerts.push({
          id: nextId(),
          severity: 'critico',
          message: 'Crise hipertensiva',
          detail: `PA ${vital.raw} — sistólica ≥ 180 mmHg`,
        })
      } else if (vital.systolic >= 140) {
        alerts.push({
          id: nextId(),
          severity: 'aviso',
          message: 'Hipertensão Estágio 1',
          detail: `PA ${vital.raw} — sistólica 140–179 mmHg`,
        })
      } else if (vital.systolic >= 120) {
        alerts.push({
          id: nextId(),
          severity: 'info',
          message: 'Pré-hipertensão',
          detail: `PA ${vital.raw} — sistólica 120–139 mmHg`,
        })
      }
    }

    // --- Blood glucose rules ---
    if (vital.type === 'glicemia' && vital.value !== undefined) {
      if (vital.value > 300) {
        alerts.push({
          id: nextId(),
          severity: 'critico',
          message: 'Hiperglicemia grave',
          detail: `Glicemia ${vital.value} mg/dL`,
        })
      } else if (vital.value > 200) {
        alerts.push({
          id: nextId(),
          severity: 'aviso',
          message: 'Hiperglicemia',
          detail: `Glicemia ${vital.value} mg/dL`,
        })
      }
    }
  }

  // --- Symptom-based rules ---
  const precordialTerms = ['dor no peito', 'dor precordial', 'dor torácica']
  const hasPrecordial = entities.symptoms.some(s => precordialTerms.includes(s))
  if (hasPrecordial) {
    alerts.push({
      id: nextId(),
      severity: 'info',
      message: 'Considerar protocolo cardíaco',
      detail: 'Dor precordial detectada na transcrição',
    })
  }

  return alerts
}
