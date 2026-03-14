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

  valores: {
    pa: /(?:pressão|pa|p\.a\.?)\s*(?:arterial|de)?\s*(?:é|está|:)?\s*(\d{2,3})\s*[\/x×por]\s*(\d{2,3})/i,
    glicemia: /(?:glicemia|glicose|gli)\s*(?:de|:)?\s*(\d{2,4})/i,
    peso: /(?:peso|pesa|pesando)\s*(?:de|:)?\s*(\d{2,3}(?:[.,]\d)?)\s*(?:kg|quilos?)?/i,
    fc: /(?:frequência cardíaca|fc|pulso|batimentos?)\s*(?:de|:)?\s*(\d{2,3})\s*(?:bpm|batimentos?)?/i,
  },
}
