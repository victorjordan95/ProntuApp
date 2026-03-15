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
      <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded px-2 py-1.5">
        Rascunho gerado por IA — revise antes de finalizar o prontuário.
      </p>

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

      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={handleCopy}
          className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors"
        >
          {copied ? 'Copiado!' : 'Copiar'}
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
