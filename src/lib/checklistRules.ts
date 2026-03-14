import { Entities, ChecklistItem } from '../types'

/**
 * Infers pending checklist items from detected clinical entities.
 * Each rule maps a clinical condition to an actionable item.
 *
 * NOTE for fine-tuning: add rules here as new specialties are added.
 */
export function buildChecklist(entities: Entities): ChecklistItem[] {
  const items: ChecklistItem[] = []
  let counter = 0
  const nextId = () => `cl-${++counter}`

  const precordialTerms = ['dor no peito', 'dor precordial', 'dor torácica']
  if (entities.symptoms.some(s => precordialTerms.includes(s))) {
    items.push({ id: nextId(), text: 'Solicitar ECG', done: false })
  }

  const diabetesTerms = ['diabetes', 'diabetes mellitus', 'dm2', 'dm1']
  if (entities.diagnoses.some(d => diabetesTerms.includes(d))) {
    items.push({ id: nextId(), text: 'Verificar glicemia em jejum', done: false })
  }

  const htnTerms = ['hipertensão', 'hipertensão arterial', 'pressão alta']
  if (entities.diagnoses.some(d => htnTerms.includes(d))) {
    items.push({ id: nextId(), text: 'Orientar dieta hipossódica', done: false })
  }

  if (entities.medications.length > 0) {
    items.push({ id: nextId(), text: 'Confirmar posologia com o paciente', done: false })
  }

  return items
}
