# ProntuApp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side web app that transcribes medical consultations in real time, extracts clinical entities via regex + medical dictionary, and generates a SOAP draft automatically.

**Architecture:** Event-driven hooks with single responsibility — `useSpeechRecognition` captures audio text, `useNLP` extracts entities (internally using `useEntities`), pure lib functions build SOAP and checklists. `App.tsx` wires everything together with local state and `useEffect` for derived data.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v3, Vitest, React Testing Library 16, Web Speech API

---

## Chunk 1: Foundation — Scaffolding, Types, and Library Functions

### Task 1: Scaffold the project

**Files:**
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `src/index.css`
- Create: `src/test-setup.ts`

- [ ] **Step 1: Initialize Vite project**

Run inside `ProntuApp/`:
```bash
npm create vite@latest . -- --template react-ts
```
Expected: project files created (`src/App.tsx`, `src/main.tsx`, `index.html`, etc.)

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npm install -D vitest @vitest/ui @testing-library/react@16 @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the generated file with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Configure Tailwind in `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        brand: '#059669',
      },
      animation: {
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 6: Replace `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Add test script to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 8: Verify setup runs**

```bash
npm run dev
```
Expected: Vite dev server starts on `http://localhost:5173`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React 19 + Tailwind + Vitest"
```

---

### Task 2: Shared TypeScript types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: Medical dictionary

**Files:**
- Create: `src/lib/medicalDictionary.ts`
- Create: `src/lib/__tests__/medicalDictionary.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/medicalDictionary.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- medicalDictionary
```
Expected: FAIL — "Cannot find module '../medicalDictionary'"

- [ ] **Step 3: Write `src/lib/medicalDictionary.ts`**

```ts
export interface MedicalDictionary {
  sintomas: string[]
  medicamentos: string[]
  diagnosticos: string[]
  valores: {
    pa: RegExp
    glicemia: RegExp
    peso: RegExp
    fc: RegExp
  }
}

export const medicalDictionary: MedicalDictionary = {
  sintomas: [
    'dor no peito', 'dor precordial', 'dor torácica',
    'dispneia', 'falta de ar', 'dificuldade para respirar',
    'tontura', 'vertigem',
    'cefaleia', 'dor de cabeça',
    'náusea', 'náuseas', 'enjoo',
    'vômito', 'vômitos',
    'febre',
    'calafrio', 'calafrios',
    'cansaço', 'fadiga', 'fraqueza',
    'palpitação', 'palpitações',
    'edema', 'inchaço',
    'dor abdominal', 'dor de barriga',
    'diarreia',
    'constipação', 'prisão de ventre',
    'tosse',
    'coriza', 'rinorreia',
    'dor de garganta',
    'insônia',
    'perda de peso',
    'ganho de peso',
    'poliúria', 'urinando muito',
    'polidipsia', 'muita sede',
    'visão turva',
    'dor no pescoço',
    'dor nas costas', 'lombalgia',
    'dor nas articulações', 'artralgia',
  ],

  medicamentos: [
    'losartana', 'losartana potássica',
    'enalapril', 'captopril', 'ramipril', 'lisinopril',
    'atenolol', 'metoprolol', 'propranolol', 'carvedilol',
    'amlodipino', 'nifedipino',
    'hidroclorotiazida', 'furosemida', 'espironolactona',
    'metformina', 'glibenclamida', 'glicazida', 'sitagliptina',
    'insulina', 'insulina nph', 'insulina regular',
    'sinvastatina', 'atorvastatina', 'rosuvastatina',
    'omeprazol', 'pantoprazol', 'esomeprazol',
    'amoxicilina', 'azitromicina', 'ciprofloxacino',
    'paracetamol', 'dipirona', 'ibuprofeno',
    'aspirina', 'ácido acetilsalicílico', 'aas',
    'clopidogrel',
    'levotiroxina', 'levotiroxina sódica',
    'fluoxetina', 'sertralina', 'escitalopram',
    'alprazolam', 'clonazepam', 'diazepam',
    'amitriptilina', 'nortriptilina',
  ],

  diagnosticos: [
    'hipertensão', 'hipertensão arterial', 'pressão alta',
    'diabetes', 'diabetes mellitus', 'dm2', 'dm1',
    'hipotireoidismo', 'tireoidite',
    'hipertireoidismo',
    'asma', 'bronquite',
    'dpoc',
    'insuficiência cardíaca',
    'angina', 'angina pectoris',
    'infarto', 'infarto agudo do miocárdio',
    'arritmia', 'fibrilação atrial',
    'depressão', 'transtorno depressivo',
    'ansiedade', 'transtorno de ansiedade',
    'gastrite', 'úlcera',
    'refluxo', 'drge',
    'dislipidemia', 'colesterol alto', 'hipercolesterolemia',
    'obesidade', 'sobrepeso',
    'osteoporose',
    'artrite', 'artrose', 'osteoartrite',
    'infecção urinária', 'itu',
    'pneumonia',
    'rinite', 'rinite alérgica',
    'sinusite',
    'enxaqueca', 'migrânea',
  ],

  // Regexes capture numeric values from transcribed speech.
  // NOTE for fine-tuning: these patterns assume natural speech in pt-BR.
  // Common speech variations: "pressão cento e quarenta e cinco por noventa"
  // would need a separate number-words-to-digits pre-processor.
  valores: {
    pa: /(?:pressão|pa|p\.a\.?)\s*(?:arterial|de)?\s*(?:é|está|:)?\s*(\d{2,3})\s*[\/x×por]\s*(\d{2,3})/i,
    glicemia: /(?:glicemia|glicose|gli)\s*(?:de|:)?\s*(\d{2,4})/i,
    peso: /(?:peso|pesa|pesando)\s*(?:de|:)?\s*(\d{2,3}(?:[.,]\d)?)\s*(?:kg|quilos?)?/i,
    fc: /(?:frequência cardíaca|fc|pulso|batimentos?)\s*(?:de|:)?\s*(\d{2,3})\s*(?:bpm|batimentos?)?/i,
  },
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- medicalDictionary
```
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/medicalDictionary.ts src/lib/__tests__/medicalDictionary.test.ts
git commit -m "feat: add medical dictionary with terms and clinical value regexes"
```

---

### Task 4: Alert rules

**Files:**
- Create: `src/lib/alertRules.ts`
- Create: `src/lib/__tests__/alertRules.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/alertRules.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { applyRules } from '../alertRules'
import { Entities } from '../../types'

const emptyEntities = (): Entities => ({
  symptoms: [], medications: [], diagnoses: [], vitals: [],
})

describe('applyRules', () => {
  it('returns no alerts for normal values', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '115/75', systolic: 115, diastolic: 75 }],
    }
    expect(applyRules(entities)).toHaveLength(0)
  })

  it('PA 145/90 → aviso Hipertensão Estágio 1', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 }],
    }
    const alerts = applyRules(entities)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('aviso')
    expect(alerts[0].message).toBe('Hipertensão Estágio 1')
  })

  it('PA 185/110 → crítico Crise hipertensiva', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '185/110', systolic: 185, diastolic: 110 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('critico')
    expect(alerts[0].message).toBe('Crise hipertensiva')
  })

  it('PA 125/80 → info Pré-hipertensão', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'pa', raw: '125/80', systolic: 125, diastolic: 80 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('info')
    expect(alerts[0].message).toBe('Pré-hipertensão')
  })

  it('glicemia 250 → aviso Hiperglicemia', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 250', value: 250 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('aviso')
    expect(alerts[0].message).toBe('Hiperglicemia')
  })

  it('glicemia 310 → crítico Hiperglicemia grave', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 310', value: 310 }],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].severity).toBe('critico')
    expect(alerts[0].message).toBe('Hiperglicemia grave')
  })

  it('dor no peito → info protocolo cardíaco', () => {
    const entities: Entities = {
      ...emptyEntities(),
      symptoms: ['dor no peito'],
    }
    const alerts = applyRules(entities)
    expect(alerts[0].message).toContain('protocolo cardíaco')
    expect(alerts[0].severity).toBe('info')
  })

  it('dor precordial → info protocolo cardíaco', () => {
    const entities: Entities = {
      ...emptyEntities(),
      symptoms: ['dor precordial'],
    }
    const alerts = applyRules(entities)
    expect(alerts.some(a => a.message.includes('protocolo cardíaco'))).toBe(true)
  })

  it('each alert has a unique id', () => {
    const entities: Entities = {
      ...emptyEntities(),
      vitals: [
        { type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 },
        { type: 'glicemia', raw: 'glicemia 250', value: 250 },
      ],
      symptoms: ['dor no peito'],
    }
    const alerts = applyRules(entities)
    const ids = alerts.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- alertRules
```
Expected: FAIL — "Cannot find module '../alertRules'"

- [ ] **Step 3: Write `src/lib/alertRules.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- alertRules
```
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/alertRules.ts src/lib/__tests__/alertRules.test.ts
git commit -m "feat: add clinical alert rules (PA, glicemia, dor precordial)"
```

---

### Task 5: Checklist rules

**Files:**
- Create: `src/lib/checklistRules.ts`
- Create: `src/lib/__tests__/checklistRules.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/checklistRules.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- checklistRules
```

- [ ] **Step 3: Write `src/lib/checklistRules.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- checklistRules
```
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/checklistRules.ts src/lib/__tests__/checklistRules.test.ts
git commit -m "feat: add checklist inference rules"
```

---

### Task 6: SOAP builder

**Files:**
- Create: `src/lib/soapBuilder.ts`
- Create: `src/lib/__tests__/soapBuilder.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/soapBuilder.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSOAP } from '../soapBuilder'
import { Entities, Segment } from '../../types'

const empty = (): Entities => ({
  symptoms: [], medications: [], diagnoses: [], vitals: [],
})

describe('buildSOAP', () => {
  it('returns empty strings when entities are empty', () => {
    const soap = buildSOAP(empty(), [])
    expect(soap.s).toBe('')
    expect(soap.o).toBe('')
    expect(soap.a).toBe('')
    expect(soap.p).toBe('')
  })

  it('S — includes patient symptoms', () => {
    const soap = buildSOAP({ ...empty(), symptoms: ['dor no peito', 'dispneia'] }, [])
    expect(soap.s).toContain('dor no peito')
    expect(soap.s).toContain('dispneia')
  })

  it('O — includes PA vital', () => {
    const entities: Entities = {
      ...empty(),
      vitals: [{ type: 'pa', raw: '145/90', systolic: 145, diastolic: 90 }],
    }
    const soap = buildSOAP(entities, [])
    expect(soap.o).toContain('PA: 145/90')
  })

  it('O — includes glicemia vital', () => {
    const entities: Entities = {
      ...empty(),
      vitals: [{ type: 'glicemia', raw: 'glicemia 250', value: 250 }],
    }
    const soap = buildSOAP(entities, [])
    expect(soap.o).toContain('250')
  })

  it('A — includes diagnoses', () => {
    const soap = buildSOAP({ ...empty(), diagnoses: ['hipertensão', 'diabetes'] }, [])
    expect(soap.a).toContain('hipertensão')
    expect(soap.a).toContain('diabetes')
  })

  it('P — includes medications', () => {
    const soap = buildSOAP({ ...empty(), medications: ['losartana', 'metformina'] }, [])
    expect(soap.p).toContain('losartana')
    expect(soap.p).toContain('metformina')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- soapBuilder
```

- [ ] **Step 3: Write `src/lib/soapBuilder.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- soapBuilder
```
Expected: all 6 tests PASS

- [ ] **Step 5: Run all tests so far**

```bash
npm test
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/soapBuilder.ts src/lib/__tests__/soapBuilder.test.ts
git commit -m "feat: add SOAP builder (pure function)"
```

---

## Chunk 2: Hooks — Entity Aggregation, NLP Pipeline, Speech Recognition

### Task 7: useEntities hook

**Files:**
- Create: `src/hooks/useEntities.ts`
- Create: `src/hooks/__tests__/useEntities.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/__tests__/useEntities.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- useEntities
```

- [ ] **Step 3: Write `src/hooks/useEntities.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- useEntities
```
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEntities.ts src/hooks/__tests__/useEntities.test.ts
git commit -m "feat: add useEntities hook with deduplication"
```

---

### Task 8: useNLP hook

**Files:**
- Create: `src/hooks/useNLP.ts`
- Create: `src/hooks/__tests__/useNLP.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/__tests__/useNLP.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- useNLP
```

- [ ] **Step 3: Write `src/hooks/useNLP.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- useNLP
```
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNLP.ts src/hooks/__tests__/useNLP.test.ts
git commit -m "feat: add useNLP pipeline hook (regex + dictionary)"
```

---

### Task 9: useSpeechRecognition hook

**Files:**
- Create: `src/hooks/useSpeechRecognition.ts`
- Create: `src/hooks/__tests__/useSpeechRecognition.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/__tests__/useSpeechRecognition.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechRecognition } from '../useSpeechRecognition'

// Mock SpeechRecognition API
class MockSpeechRecognition {
  continuous = false
  lang = ''
  interimResults = false
  maxAlternatives = 1
  onresult: ((e: SpeechRecognitionEvent) => void) | null = null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
}

let mockInstance: MockSpeechRecognition

beforeEach(() => {
  mockInstance = new MockSpeechRecognition()
  vi.stubGlobal('SpeechRecognition', vi.fn(() => mockInstance))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useSpeechRecognition', () => {
  it('detects API support', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current.isSupported).toBe(true)
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.transcript).toHaveLength(0)
  })

  it('start() sets isRecording to true', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    expect(result.current.isRecording).toBe(true)
    expect(mockInstance.start).toHaveBeenCalledOnce()
  })

  it('start() configures recognition correctly', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    expect(mockInstance.continuous).toBe(true)
    expect(mockInstance.lang).toBe('pt-BR')
    expect(mockInstance.interimResults).toBe(true)
  })

  it('final result adds segment to transcript', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => {
      mockInstance.onresult?.({
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: 'dor no peito', confidence: 0.9 },
          length: 1,
        }] as unknown as SpeechRecognitionResultList,
      } as SpeechRecognitionEvent)
    })
    expect(result.current.transcript).toHaveLength(1)
    expect(result.current.transcript[0].text).toBe('dor no peito')
    expect(result.current.transcript[0].isFinal).toBe(true)
  })

  it('segment gets current speaker label', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => {
      mockInstance.onresult?.({
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: 'olá', confidence: 0.9 },
          length: 1,
        }] as unknown as SpeechRecognitionResultList,
      } as SpeechRecognitionEvent)
    })
    expect(result.current.transcript[0].speaker).toBe('doctor')
  })

  it('toggleSpeaker switches from doctor to patient', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current.currentSpeaker).toBe('doctor')
    act(() => result.current.toggleSpeaker())
    expect(result.current.currentSpeaker).toBe('patient')
    act(() => result.current.toggleSpeaker())
    expect(result.current.currentSpeaker).toBe('doctor')
  })

  it('pause() calls stop and sets isPaused', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => result.current.pause())
    expect(result.current.isPaused).toBe(true)
    expect(mockInstance.stop).toHaveBeenCalled()
  })

  it('stop() ends recording and clears interim text', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => result.current.stop())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.interimText).toBe('')
  })

  it('duration increments after start', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.duration).toBeGreaterThanOrEqual(3)
  })

  it('not-allowed error sets error state', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.start())
    act(() => {
      mockInstance.onerror?.({ error: 'not-allowed' } as SpeechRecognitionErrorEvent)
    })
    expect(result.current.error).toContain('Permissão')
    expect(result.current.isRecording).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- useSpeechRecognition
```

- [ ] **Step 3: Write `src/hooks/useSpeechRecognition.ts`**

```ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { Segment, Speaker } from '../types'

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

const MAX_RECONNECT = 3

export function useSpeechRecognition() {
  const [transcript, setTranscript]           = useState<Segment[]>([])
  const [interimText, setInterimText]         = useState('')
  const [isRecording, setIsRecording]         = useState(false)
  const [isPaused, setIsPaused]               = useState(false)
  const [duration, setDuration]               = useState(0)
  const [currentSpeaker, setCurrentSpeaker]   = useState<Speaker>('doctor')
  const [error, setError]                     = useState<string | null>(null)

  const recognitionRef    = useRef<SpeechRecognition | null>(null)
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef      = useRef<number>(0)
  const reconnectRef      = useRef(0)
  const isRecordingRef    = useRef(false)   // ref so onend closure sees latest value
  const speakerRef        = useRef<Speaker>('doctor')
  const segIdRef          = useRef(0)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const buildRecognition = useCallback((): SpeechRecognition => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const r = new SR()
    r.continuous      = true
    r.lang            = 'pt-BR'
    r.interimResults  = true
    r.maxAlternatives = 1
    return r
  }, [])

  const attachHandlers = useCallback((r: SpeechRecognition) => {
    r.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (!text) continue
        if (result.isFinal) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          const seg: Segment = {
            id:        `seg-${++segIdRef.current}`,
            speaker:   speakerRef.current,
            text,
            timestamp: elapsed,
            isFinal:   true,
            entities:  [],
          }
          setTranscript(prev => [...prev, seg])
          setInterimText('')
          reconnectRef.current = 0
        } else {
          interim += text + ' '
        }
      }
      if (interim) setInterimText(interim.trim())
    }

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada. Habilite nas configurações do navegador.')
        setIsRecording(false)
        isRecordingRef.current = false
      }
      // 'no-speech' is expected during natural pauses — ignore
    }

    r.onend = () => {
      // Auto-reconnect if still supposed to be recording (not paused/stopped by user)
      if (isRecordingRef.current && reconnectRef.current < MAX_RECONNECT) {
        reconnectRef.current++
        try { r.start() } catch {
          setError('Reconhecimento interrompido. Por favor, reinicie a consulta.')
          setIsRecording(false)
          isRecordingRef.current = false
        }
      }
    }
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (!isSupported) return
    const r = buildRecognition()
    attachHandlers(r)
    recognitionRef.current    = r
    startTimeRef.current      = Date.now()
    reconnectRef.current      = 0
    isRecordingRef.current    = true
    speakerRef.current        = 'doctor'

    setTranscript([])
    setInterimText('')
    setDuration(0)
    setError(null)
    setIsRecording(true)
    setIsPaused(false)
    setCurrentSpeaker('doctor')

    startTimer()
    try { r.start() } catch {
      setError('Não foi possível iniciar o reconhecimento de voz.')
      setIsRecording(false)
      isRecordingRef.current = false
    }
  }, [isSupported, buildRecognition, attachHandlers, startTimer])

  const pause = useCallback(() => {
    if (!recognitionRef.current || !isRecording) return
    isRecordingRef.current = false
    recognitionRef.current.stop()
    setIsPaused(true)
    stopTimer()
  }, [isRecording, stopTimer])

  const resume = useCallback(() => {
    if (!recognitionRef.current || !isPaused) return
    isRecordingRef.current = true
    setIsPaused(false)
    startTimer()
    try { recognitionRef.current.start() } catch {
      setError('Não foi possível retomar o reconhecimento.')
    }
  }, [isPaused, startTimer])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    isRecordingRef.current = false
    recognitionRef.current.stop()
    recognitionRef.current = null
    setIsRecording(false)
    setIsPaused(false)
    setInterimText('')
    stopTimer()
  }, [stopTimer])

  const toggleSpeaker = useCallback(() => {
    setCurrentSpeaker(prev => {
      const next: Speaker = prev === 'doctor' ? 'patient' : 'doctor'
      speakerRef.current = next
      return next
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false
      recognitionRef.current?.stop()
      stopTimer()
    }
  }, [stopTimer])

  return {
    transcript,
    interimText,
    isRecording,
    isPaused,
    duration,
    currentSpeaker,
    error,
    isSupported,
    start,
    pause,
    resume,
    stop,
    toggleSpeaker,
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- useSpeechRecognition
```
Expected: all 11 tests PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSpeechRecognition.ts src/hooks/__tests__/useSpeechRecognition.test.ts
git commit -m "feat: add useSpeechRecognition hook with auto-reconnect"
```

---

## Chunk 3: Components and App Integration

### Task 10: RecordingControls component

**Files:**
- Create: `src/components/RecordingControls.tsx`
- Create: `src/components/__tests__/RecordingControls.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/RecordingControls.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecordingControls } from '../RecordingControls'

const baseProps = {
  status: 'idle' as const,
  duration: 0,
  currentSpeaker: 'doctor' as const,
  isSupported: true,
  error: null,
  onStart: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onStop: vi.fn(),
  onToggleSpeaker: vi.fn(),
}

describe('RecordingControls', () => {
  it('shows Iniciar button when idle', () => {
    render(<RecordingControls {...baseProps} />)
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument()
  })

  it('calls onStart when Iniciar is clicked', () => {
    const onStart = vi.fn()
    render(<RecordingControls {...baseProps} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('shows Pausar and Encerrar when recording', () => {
    render(<RecordingControls {...baseProps} status="recording" />)
    expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /encerrar/i })).toBeInTheDocument()
  })

  it('shows Continuar when paused', () => {
    render(<RecordingControls {...baseProps} status="paused" />)
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument()
  })

  it('formats duration correctly', () => {
    render(<RecordingControls {...baseProps} status="recording" duration={125} />)
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  it('shows speaker toggle when recording', () => {
    render(<RecordingControls {...baseProps} status="recording" />)
    expect(screen.getByRole('button', { name: /médico|paciente/i })).toBeInTheDocument()
  })

  it('shows unsupported message when isSupported is false', () => {
    render(<RecordingControls {...baseProps} isSupported={false} />)
    expect(screen.getByText(/chrome|edge/i)).toBeInTheDocument()
  })

  it('shows error message when error is set', () => {
    render(<RecordingControls {...baseProps} error="Permissão negada" />)
    expect(screen.getByText(/permissão negada/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- RecordingControls
```

- [ ] **Step 3: Write `src/components/RecordingControls.tsx`**

```tsx
import { ConsultaStatus, Speaker } from '../types'

interface Props {
  status: ConsultaStatus
  duration: number
  currentSpeaker: Speaker
  isSupported: boolean
  error: string | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onToggleSpeaker: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingControls({
  status, duration, currentSpeaker, isSupported,
  error, onStart, onPause, onResume, onStop, onToggleSpeaker,
}: Props) {
  if (!isSupported) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-4 text-center text-sm text-amber-800">
        Transcrição de voz não suportada. Use <strong>Chrome</strong> ou <strong>Edge</strong>.
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center gap-3">
      {/* Recording indicator */}
      {status === 'recording' && (
        <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium min-w-[6rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          {formatDuration(duration)}
        </span>
      )}
      {status === 'paused' && (
        <span className="flex items-center gap-1.5 text-sm text-stone-500 min-w-[6rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          {formatDuration(duration)}
        </span>
      )}
      {(status === 'idle' || status === 'ended') && (
        <span className="min-w-[6rem]" />
      )}

      {/* Main action buttons */}
      <div className="flex items-center gap-2">
        {status === 'idle' || status === 'ended' ? (
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {status === 'ended' ? 'Nova Consulta' : 'Iniciar Consulta'}
          </button>
        ) : null}

        {status === 'recording' && (
          <>
            <button
              onClick={onPause}
              className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
            >
              Pausar
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Encerrar
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={onResume}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Encerrar
            </button>
          </>
        )}
      </div>

      {/* Speaker toggle — visible during active recording or paused */}
      {(status === 'recording' || status === 'paused') && (
        <button
          onClick={onToggleSpeaker}
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            currentSpeaker === 'doctor'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {currentSpeaker === 'doctor' ? '🩺 Médico' : '🧑 Paciente'}
        </button>
      )}

      {/* Error toast */}
      {error && (
        <p className="ml-auto text-xs text-red-600 max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- RecordingControls
```
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/RecordingControls.tsx src/components/__tests__/RecordingControls.test.tsx
git commit -m "feat: add RecordingControls component"
```

---

### Task 11: TranscriptPanel component

**Files:**
- Create: `src/components/TranscriptPanel.tsx`
- Create: `src/components/__tests__/TranscriptPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/TranscriptPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from '../TranscriptPanel'
import { Segment } from '../../types'

const seg = (text: string, speaker: Segment['speaker'] = 'doctor'): Segment => ({
  id: '1', speaker, text, timestamp: 10, isFinal: true, entities: [],
})

describe('TranscriptPanel', () => {
  it('shows empty state when no segments', () => {
    render(<TranscriptPanel segments={[]} interimText="" isRecording={false} />)
    expect(screen.getByText(/aguardando/i)).toBeInTheDocument()
  })

  it('renders a transcript segment', () => {
    render(<TranscriptPanel segments={[seg('dor no peito')]} interimText="" isRecording={false} />)
    expect(screen.getByText(/dor no peito/i)).toBeInTheDocument()
  })

  it('shows doctor label for doctor segments', () => {
    render(<TranscriptPanel segments={[seg('olá', 'doctor')]} interimText="" isRecording={false} />)
    expect(screen.getByText(/médico/i)).toBeInTheDocument()
  })

  it('shows patient label for patient segments', () => {
    render(<TranscriptPanel segments={[seg('tenho dor', 'patient')]} interimText="" isRecording={false} />)
    expect(screen.getByText(/paciente/i)).toBeInTheDocument()
  })

  it('shows interim text while recording', () => {
    render(<TranscriptPanel segments={[]} interimText="texto parcial..." isRecording={true} />)
    expect(screen.getByText(/texto parcial/i)).toBeInTheDocument()
  })

  it('shows consent banner when recording', () => {
    render(<TranscriptPanel segments={[]} interimText="" isRecording={true} />)
    expect(screen.getByText(/gravação ativa|consentimento/i)).toBeInTheDocument()
  })

  it('highlights symptom entity with yellow style', () => {
    const segWithEntity: Segment = {
      id: '1', speaker: 'patient', text: 'dor no peito',
      timestamp: 5, isFinal: true,
      entities: [{ text: 'dor no peito', category: 'symptom', start: 0, end: 12 }],
    }
    const { container } = render(
      <TranscriptPanel segments={[segWithEntity]} interimText="" isRecording={false} />
    )
    const highlight = container.querySelector('[data-category="symptom"]')
    expect(highlight).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- TranscriptPanel
```

- [ ] **Step 3: Write `src/components/TranscriptPanel.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { Segment, EntityCategory } from '../types'

interface Props {
  segments: Segment[]
  interimText: string
  isRecording: boolean
}

const CATEGORY_STYLES: Record<EntityCategory, string> = {
  symptom:    'bg-yellow-100 text-yellow-900 rounded px-0.5',
  medication: 'bg-purple-100 text-purple-900 rounded px-0.5',
  diagnosis:  'bg-blue-100   text-blue-900   rounded px-0.5',
  vital:      'bg-green-100  text-green-900  rounded px-0.5',
}

/**
 * Renders a text string with entity spans highlighted by category.
 * Entity positions (start/end) come from the NLP pipeline.
 */
function HighlightedText({ text, entities }: Pick<Segment, 'text' | 'entities'>) {
  if (entities.length === 0) return <span>{text}</span>

  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const entity of sorted) {
    if (entity.start > cursor) {
      parts.push(<span key={cursor}>{text.slice(cursor, entity.start)}</span>)
    }
    parts.push(
      <mark
        key={entity.start}
        data-category={entity.category}
        className={CATEGORY_STYLES[entity.category]}
        title={entity.category}
      >
        {text.slice(entity.start, entity.end)}
      </mark>
    )
    cursor = entity.end
  }
  if (cursor < text.length) {
    parts.push(<span key={cursor}>{text.slice(cursor)}</span>)
  }

  return <>{parts}</>
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function TranscriptPanel({ segments, interimText, isRecording }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest segment
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments, interimText])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Consent banner — visible only during active recording */}
      {isRecording && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800 flex items-center gap-2">
          <span className="text-amber-500">⚠</span>
          <span>
            <strong>Gravação ativa.</strong> O paciente foi informado sobre a transcrição desta consulta.
            Sugestões geradas são apenas apoio clínico — não substituem julgamento médico.
          </span>
        </div>
      )}

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {segments.length === 0 && !interimText && (
          <p className="text-stone-400 text-sm text-center mt-8">
            Aguardando início da consulta...
          </p>
        )}

        {segments.map(segment => (
          <div key={segment.id} className="flex gap-2">
            {/* Speaker badge */}
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full self-start mt-0.5 ${
              segment.speaker === 'doctor'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {segment.speaker === 'doctor' ? 'Médico' : 'Paciente'}
            </span>

            {/* Text with highlights */}
            <div className="flex-1 text-sm text-stone-800 leading-relaxed">
              <HighlightedText text={segment.text} entities={segment.entities} />
              <span className="ml-2 text-xs text-stone-400">{formatTimestamp(segment.timestamp)}</span>
            </div>
          </div>
        ))}

        {/* Interim (partial) text */}
        {interimText && (
          <div className="flex gap-2 opacity-60">
            <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full self-start mt-0.5 bg-stone-100 text-stone-600">
              ...
            </span>
            <p className="flex-1 text-sm text-stone-500 italic">{interimText}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- TranscriptPanel
```
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TranscriptPanel.tsx src/components/__tests__/TranscriptPanel.test.tsx
git commit -m "feat: add TranscriptPanel with entity highlighting"
```

---

### Task 12: SoapEditor component

**Files:**
- Create: `src/components/SoapEditor.tsx`
- Create: `src/components/__tests__/SoapEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/SoapEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SoapEditor } from '../SoapEditor'
import { SOAPDraft } from '../../types'

const draft: SOAPDraft = {
  s: 'Paciente relata: dor no peito.',
  o: 'PA: 145/90 mmHg',
  a: 'hipertensão.',
  p: 'Medicamentos: losartana.',
}

describe('SoapEditor', () => {
  it('renders all 4 SOAP sections', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByText(/subjetivo/i)).toBeInTheDocument()
    expect(screen.getByText(/objetivo/i)).toBeInTheDocument()
    expect(screen.getByText(/avaliação/i)).toBeInTheDocument()
    expect(screen.getByText(/plano/i)).toBeInTheDocument()
  })

  it('displays draft content in textareas', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue(/dor no peito/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/145\/90/i)).toBeInTheDocument()
  })

  it('calls onChange when user edits S section', () => {
    const onChange = vi.fn()
    render(<SoapEditor draft={draft} onChange={onChange} />)
    const textarea = screen.getByDisplayValue(/dor no peito/i)
    fireEvent.change(textarea, { target: { value: 'novo texto' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ s: 'novo texto' }))
  })

  it('shows disclaimer label', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByText(/rascunho gerado|revise antes/i)).toBeInTheDocument()
  })

  it('shows copy button', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
  })

  it('shows download button', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- SoapEditor
```

- [ ] **Step 3: Write `src/components/SoapEditor.tsx`**

```tsx
import { useState } from 'react'
import { SOAPDraft } from '../types'

interface Props {
  draft: SOAPDraft
  onChange: (draft: SOAPDraft) => void
}

const SECTIONS: { key: keyof SOAPDraft; label: string; placeholder: string }[] = [
  { key: 's', label: 'S — Subjetivo',  placeholder: 'Queixas e sintomas relatados pelo paciente...' },
  { key: 'o', label: 'O — Objetivo',   placeholder: 'Dados objetivos: PA, FC, peso, exame físico...' },
  { key: 'a', label: 'A — Avaliação',  placeholder: 'Hipóteses diagnósticas...' },
  { key: 'p', label: 'P — Plano',      placeholder: 'Conduta, medicamentos, solicitações...' },
]

function buildTextExport(draft: SOAPDraft): string {
  return [
    'PRONTUÁRIO — SOAP',
    '==================',
    '',
    'S — SUBJETIVO',
    draft.s || '(vazio)',
    '',
    'O — OBJETIVO',
    draft.o || '(vazio)',
    '',
    'A — AVALIAÇÃO',
    draft.a || '(vazio)',
    '',
    'P — PLANO',
    draft.p || '(vazio)',
  ].join('\n')
}

export function SoapEditor({ draft, onChange }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = buildTextExport(draft)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select all text in first textarea
      const el = document.querySelector<HTMLTextAreaElement>('textarea[data-soap]')
      el?.select()
    }
  }

  const handleDownload = () => {
    const text = buildTextExport(draft)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prontuario-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Disclaimer */}
      <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded px-2 py-1.5">
        Rascunho gerado por IA — revise antes de finalizar o prontuário.
      </p>

      {/* SOAP sections */}
      {SECTIONS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
            {label}
          </label>
          <textarea
            data-soap={key}
            value={draft[key]}
            onChange={e => onChange({ ...draft, [key]: e.target.value })}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          />
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={handleCopy}
          className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors"
        >
          {copied ? '✓ Copiado!' : 'Copiar'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Download .txt
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- SoapEditor
```
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SoapEditor.tsx src/components/__tests__/SoapEditor.test.tsx
git commit -m "feat: add SoapEditor component with copy/download"
```

---

### Task 13: Checklist component

**Files:**
- Create: `src/components/Checklist.tsx`
- Create: `src/components/__tests__/Checklist.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/Checklist.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checklist } from '../Checklist'
import { ChecklistItem } from '../../types'

const items: ChecklistItem[] = [
  { id: '1', text: 'Solicitar ECG', done: false },
  { id: '2', text: 'Verificar glicemia em jejum', done: true },
]

describe('Checklist', () => {
  it('shows empty state when no items', () => {
    render(<Checklist items={[]} onToggle={vi.fn()} />)
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renders all checklist items', () => {
    render(<Checklist items={items} onToggle={vi.fn()} />)
    expect(screen.getByText('Solicitar ECG')).toBeInTheDocument()
    expect(screen.getByText('Verificar glicemia em jejum')).toBeInTheDocument()
  })

  it('completed item has checked checkbox', () => {
    render(<Checklist items={items} onToggle={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('calls onToggle with item id when clicked', () => {
    const onToggle = vi.fn()
    render(<Checklist items={items} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onToggle).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- Checklist
```

- [ ] **Step 3: Write `src/components/Checklist.tsx`**

```tsx
import { ChecklistItem } from '../types'

interface Props {
  items: ChecklistItem[]
  onToggle: (id: string) => void
}

export function Checklist({ items, onToggle }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-stone-400 text-sm text-center mt-6">
        Nenhum item inferido ainda.
        <br />
        <span className="text-xs">Os itens aparecem conforme a consulta avança.</span>
      </p>
    )
  }

  const pending   = items.filter(i => !i.done)
  const completed = items.filter(i =>  i.done)

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Pendentes
          </p>
          <ul className="space-y-2">
            {pending.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={item.done}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor={item.id} className="text-sm text-stone-800 cursor-pointer">
                  {item.text}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Concluídos
          </p>
          <ul className="space-y-2">
            {completed.map(item => (
              <li key={item.id} className="flex items-center gap-2 opacity-60">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={item.done}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor={item.id} className="text-sm text-stone-500 line-through cursor-pointer">
                  {item.text}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- Checklist
```
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Checklist.tsx src/components/__tests__/Checklist.test.tsx
git commit -m "feat: add Checklist component"
```

---

### Task 14: InsightsPanel component

**Files:**
- Create: `src/components/InsightsPanel.tsx`
- Create: `src/components/__tests__/InsightsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/InsightsPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InsightsPanel } from '../InsightsPanel'
import { Alert, SOAPDraft, ChecklistItem } from '../../types'

const noAlerts: Alert[] = []
const emptySOAP: SOAPDraft = { s: '', o: '', a: '', p: '' }
const noChecklist: ChecklistItem[] = []

const baseProps = {
  alerts: noAlerts,
  soapDraft: emptySOAP,
  onSoapChange: vi.fn(),
  checklist: noChecklist,
  onChecklistToggle: vi.fn(),
}

describe('InsightsPanel', () => {
  it('renders three tab buttons', () => {
    render(<InsightsPanel {...baseProps} />)
    expect(screen.getByRole('tab', { name: /insights/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /soap/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /checklist/i })).toBeInTheDocument()
  })

  it('shows Insights tab by default', () => {
    render(<InsightsPanel {...baseProps} />)
    expect(screen.getByRole('tab', { name: /insights/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('switching to SOAP tab shows SoapEditor', () => {
    render(<InsightsPanel {...baseProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /soap/i }))
    expect(screen.getByText(/subjetivo/i)).toBeInTheDocument()
  })

  it('switching to Checklist tab shows Checklist', () => {
    render(<InsightsPanel {...baseProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /checklist/i }))
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renders alert cards on Insights tab', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'critico', message: 'Crise hipertensiva', detail: 'PA 185/110' },
    ]
    render(<InsightsPanel {...baseProps} alerts={alerts} />)
    expect(screen.getByText('Crise hipertensiva')).toBeInTheDocument()
  })

  it('shows alert count badge on tab when alerts present', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'aviso', message: 'Hipertensão Estágio 1' },
      { id: '2', severity: 'info',  message: 'Pré-hipertensão' },
    ]
    render(<InsightsPanel {...baseProps} alerts={alerts} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- InsightsPanel
```

- [ ] **Step 3: Write `src/components/InsightsPanel.tsx`**

```tsx
import { useState } from 'react'
import { Alert, SOAPDraft, ChecklistItem, AlertSeverity } from '../types'
import { SoapEditor } from './SoapEditor'
import { Checklist } from './Checklist'

interface Props {
  alerts: Alert[]
  soapDraft: SOAPDraft
  onSoapChange: (draft: SOAPDraft) => void
  checklist: ChecklistItem[]
  onChecklistToggle: (id: string) => void
}

type Tab = 'insights' | 'soap' | 'checklist'

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; badge: string; label: string }> = {
  critico: { border: 'border-red-300',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',    label: 'Crítico'  },
  aviso:   { border: 'border-amber-300',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-800',  label: 'Aviso'    },
  info:    { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-800',   label: 'Info'     },
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = SEVERITY_STYLES[alert.severity]
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-stone-800">{alert.message}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>
      {alert.detail && (
        <p className="text-xs text-stone-500">{alert.detail}</p>
      )}
      <p className="text-xs text-stone-400 mt-1 italic">Sugestão de apoio clínico</p>
    </div>
  )
}

export function InsightsPanel({ alerts, soapDraft, onSoapChange, checklist, onChecklistToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('insights')

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'insights',  label: 'Insights',  badge: alerts.length > 0 ? alerts.length : undefined },
    { id: 'soap',      label: 'SOAP' },
    { id: 'checklist', label: 'Checklist', badge: checklist.filter(i => !i.done).length || undefined },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 mb-4 shrink-0" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="min-w-[1.25rem] h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-stone-400 text-sm text-center mt-6">
                Nenhum alerta detectado.
                <br />
                <span className="text-xs">Os alertas aparecem conforme a consulta avança.</span>
              </p>
            ) : (
              alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        )}

        {activeTab === 'soap' && (
          <SoapEditor draft={soapDraft} onChange={onSoapChange} />
        )}

        {activeTab === 'checklist' && (
          <Checklist items={checklist} onToggle={onChecklistToggle} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- InsightsPanel
```
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InsightsPanel.tsx src/components/__tests__/InsightsPanel.test.tsx
git commit -m "feat: add InsightsPanel with Insights/SOAP/Checklist tabs"
```

---

---

## Chunk 4: App Integration

### Task 15: App.tsx — wire everything together

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useNLP } from './hooks/useNLP'
import { buildSOAP } from './lib/soapBuilder'
import { buildChecklist } from './lib/checklistRules'
import { TranscriptPanel } from './components/TranscriptPanel'
import { InsightsPanel } from './components/InsightsPanel'
import { RecordingControls } from './components/RecordingControls'
import { Segment, SOAPDraft, ChecklistItem, ConsultaStatus } from './types'

export default function App() {
  const speech = useSpeechRecognition()
  const nlp    = useNLP()

  // Annotated segments (with entity highlights from NLP)
  const [annotatedSegments, setAnnotatedSegments] = useState<Segment[]>([])
  const processedRef = useRef(0)

  // Derived UI state
  const [soapDraft, setSoapDraft]       = useState<SOAPDraft>({ s: '', o: '', a: '', p: '' })
  const [checklist, setChecklist]       = useState<ChecklistItem[]>([])
  const [status, setStatus]             = useState<ConsultaStatus>('idle')

  // Process new final segments through NLP pipeline.
  // nlp.processSegment is intentionally omitted from deps — it is stable
  // (memoized with useCallback) and adding it would cause infinite loops
  // because processSegment calls addEntities which triggers entity state updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unprocessed = speech.transcript.slice(processedRef.current)
    if (unprocessed.length === 0) return
    const annotated = unprocessed.map(seg => nlp.processSegment(seg))
    setAnnotatedSegments(prev => [...prev, ...annotated])
    processedRef.current = speech.transcript.length
  }, [speech.transcript])

  // Auto-update SOAP and checklist when entities change
  useEffect(() => {
    setSoapDraft(buildSOAP(nlp.entities, annotatedSegments))
  }, [nlp.entities, annotatedSegments])

  useEffect(() => {
    setChecklist(prev => {
      const fresh = buildChecklist(nlp.entities)
      // Preserve user's done state for items that already exist
      return fresh.map(item => ({
        ...item,
        done: prev.find(p => p.text === item.text)?.done ?? false,
      }))
    })
  }, [nlp.entities])

  const handleStart = () => {
    speech.start()
    setStatus('recording')
    setAnnotatedSegments([])
    setSoapDraft({ s: '', o: '', a: '', p: '' })
    setChecklist([])
    nlp.clearEntities()
    processedRef.current = 0
  }

  const handlePause  = () => { speech.pause();  setStatus('paused') }
  const handleResume = () => { speech.resume(); setStatus('recording') }
  const handleStop   = () => { speech.stop();   setStatus('ended') }

  const handleChecklistToggle = (id: string) => {
    setChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, done: !item.done } : item)
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col pb-16">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <span className="text-emerald-600 font-bold text-lg tracking-tight">ProntuApp</span>
        <span className="text-stone-400 text-sm">Assistente de consulta médica</span>
        {status === 'ended' && (
          <span className="ml-auto text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
            Consulta encerrada
          </span>
        )}
      </header>

      {/* Two-column layout (single column on mobile) */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0">
        {/* Left: Transcript — 60% */}
        <section className="flex flex-col md:w-3/5 bg-white rounded-xl border border-stone-200 p-4 min-h-64 md:min-h-0">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 shrink-0">
            Transcrição
          </h2>
          <TranscriptPanel
            segments={annotatedSegments}
            interimText={speech.interimText}
            isRecording={status === 'recording'}
          />
        </section>

        {/* Right: Insights — 40% */}
        <section className="flex flex-col md:w-2/5 bg-white rounded-xl border border-stone-200 p-4 min-h-64 md:min-h-0">
          <InsightsPanel
            alerts={nlp.alerts}
            soapDraft={soapDraft}
            onSoapChange={setSoapDraft}
            checklist={checklist}
            onChecklistToggle={handleChecklistToggle}
          />
        </section>
      </main>

      {/* Bottom controls bar */}
      <RecordingControls
        status={status}
        duration={speech.duration}
        currentSpeaker={speech.currentSpeaker}
        isSupported={speech.isSupported}
        error={speech.error}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onToggleSpeaker={speech.toggleSpeaker}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update `src/main.tsx` to import CSS**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all tests PASS

- [ ] **Step 4: Start dev server and manually verify**

```bash
npm run dev
```
Open `http://localhost:5173` in Chrome or Edge and verify:
- App loads with green header and two-column layout
- "Iniciar Consulta" button visible at bottom
- Clicking starts recording (red pulse indicator appears)
- Speaking shows transcribed text in left panel
- Speaker toggle switches between Médico/Paciente
- PA values (e.g. "pressão 145/90") trigger alerts in Insights tab
- SOAP tab shows auto-filled draft
- Checklist tab shows inferred items
- Copy and Download buttons work
- Pausing and resuming works
- Encerrar stops the consultation

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire App.tsx — integrate hooks, NLP pipeline, and all components"
```

- [ ] **Step 6: Add .gitignore for superpowers brainstorm files**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```
