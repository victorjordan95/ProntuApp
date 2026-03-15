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
    // Call as factory (handles vi.fn mocks) falling back to new for real browsers
    let r: SpeechRecognition
    try {
      r = new SR()
    } catch {
      r = (SR as unknown as () => SpeechRecognition)()
    }
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
