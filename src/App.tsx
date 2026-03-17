import { useState, useEffect, useRef } from 'react'
import { useOpenRouterTranscription } from './hooks/useOpenRouterTranscription'
import { useNLP } from './hooks/useNLP'
import { buildSOAP } from './lib/soapBuilder'
import { buildChecklist } from './lib/checklistRules'
import { TranscriptPanel } from './components/TranscriptPanel'
import { InsightsPanel } from './components/InsightsPanel'
import { RecordingControls } from './components/RecordingControls'
import type { Segment, SOAPDraft, ChecklistItem, ConsultaStatus } from './types'

export default function App() {
  const speech = useOpenRouterTranscription()
  const nlp    = useNLP()

  const [annotatedSegments, setAnnotatedSegments] = useState<Segment[]>([])
  const processedRef = useRef(0)

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
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <span className="text-emerald-600 font-bold text-lg tracking-tight">ProntuApp</span>
        <span className="text-stone-400 text-sm">Assistente de consulta médica</span>
        {status === 'ended' && (
          <span className="ml-auto text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
            Consulta encerrada
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0">
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
