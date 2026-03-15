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

  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [segments, interimText])

  return (
    <div className="flex flex-col h-full min-h-0">
      {isRecording && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800 flex items-center gap-2">
          <span className="text-amber-500">⚠</span>
          <span>
            <strong>Gravação ativa.</strong> O paciente foi informado sobre a transcrição desta consulta.
            Sugestões geradas são apenas apoio clínico — não substituem julgamento médico.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {segments.length === 0 && !interimText && (
          <p className="text-stone-400 text-sm text-center mt-8">
            Aguardando início da consulta...
          </p>
        )}

        {segments.map(segment => (
          <div key={segment.id} className="flex gap-2">
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full self-start mt-0.5 ${
              segment.speaker === 'doctor'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {segment.speaker === 'doctor' ? 'Médico' : 'Paciente'}
            </span>

            <div className="flex-1 text-sm text-stone-800 leading-relaxed">
              <HighlightedText text={segment.text} entities={segment.entities} />
              <span className="ml-2 text-xs text-stone-400">{formatTimestamp(segment.timestamp)}</span>
            </div>
          </div>
        ))}

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
