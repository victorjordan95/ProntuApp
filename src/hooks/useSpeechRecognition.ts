import { useState, useEffect, useRef, useCallback } from 'react'
import type { Segment, Speaker } from '../types'

// Local Web Speech API types (not available in all TS DOM lib versions)
interface SR {
  continuous: boolean
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SREvent) => void) | null
  onerror: ((event: SRErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface SREvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string }; length: number }>
}
interface SRErrorEvent { error: string }
type SRConstructor = new () => SR

const MAX_RECONNECT = 3

function getSRConstructor(): SRConstructor | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as SRConstructor | undefined
}

export function useSpeechRecognition() {
  const [transcript, setTranscript]           = useState<Segment[]>([])
  const [interimText, setInterimText]         = useState('')
  const [isRecording, setIsRecording]         = useState(false)
  const [isPaused, setIsPaused]               = useState(false)
  const [duration, setDuration]               = useState(0)
  const [currentSpeaker, setCurrentSpeaker]   = useState<Speaker>('doctor')
  const [error, setError]                     = useState<string | null>(null)

  const recognitionRef    = useRef<SR | null>(null)
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef      = useRef<number>(0)
  const reconnectRef      = useRef(0)
  const isRecordingRef    = useRef(false)   // ref so onend closure sees latest value
  const speakerRef        = useRef<Speaker>('doctor')
  const segIdRef          = useRef(0)

  const isSupported = typeof window !== 'undefined' && !!getSRConstructor()

  const buildRecognition = useCallback((): SR => {
    const SRCtor = getSRConstructor()!
    // Call as constructor (real browsers); fall back to factory call (vi.fn mocks)
    let r: SR
    try {
      r = new SRCtor()
    } catch {
      r = (SRCtor as unknown as () => SR)()
    }
    r.continuous      = true
    r.lang            = 'pt-BR'
    r.interimResults  = true
    r.maxAlternatives = 1
    return r
  }, [])

  const attachHandlers = useCallback((r: SR) => {
    r.onresult = (event: SREvent) => {
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

    r.onerror = (event: SRErrorEvent) => {
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
    if (!recognitionRef.current || !isRecordingRef.current) return
    isRecordingRef.current = false
    recognitionRef.current.stop()
    setIsPaused(true)
    setIsRecording(false)
    stopTimer()
  }, [stopTimer])

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
