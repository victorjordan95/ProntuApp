import { useState, useEffect, useRef, useCallback } from 'react'
import type { Segment, Speaker } from '../types'
import { encodeWAV, arrayBufferToBase64 } from '../lib/wavEncoder'

const API_KEY   = import.meta.env.VITE_OPENROUTER_API_KEY as string
const SITE_URL  = import.meta.env.VITE_OPENROUTER_SITE_URL as string
const SITE_NAME = import.meta.env.VITE_OPENROUTER_SITE_NAME as string
const CHUNK_MS  = 8000   // send audio every 8 seconds
const SAMPLE_RATE = 16000

export function useOpenRouterTranscription() {
  const [transcript,      setTranscript]      = useState<Segment[]>([])
  const [interimText,     setInterimText]     = useState('')
  const [isRecording,     setIsRecording]     = useState(false)
  const [isPaused,        setIsPaused]        = useState(false)
  const [duration,        setDuration]        = useState(0)
  const [currentSpeaker,  setCurrentSpeaker]  = useState<Speaker>('doctor')
  const [error,           setError]           = useState<string | null>(null)

  const audioCtxRef     = useRef<AudioContext | null>(null)
  const processorRef    = useRef<ScriptProcessorNode | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const samplesRef      = useRef<Float32Array[]>([])
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunkTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef    = useRef(0)
  const segIdRef        = useRef(0)
  const speakerRef      = useRef<Speaker>('doctor')
  const isRecordingRef  = useRef(false)

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  // ── helpers ──────────────────────────────────────────────────────────────

  const stopTimers = useCallback(() => {
    if (timerRef.current)      { clearInterval(timerRef.current);      timerRef.current      = null }
    if (chunkTimerRef.current) { clearInterval(chunkTimerRef.current); chunkTimerRef.current = null }
  }, [])

  const stopAudio = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const sendChunk = useCallback(async () => {
    const chunks = samplesRef.current.splice(0)   // take & clear atomically
    if (chunks.length === 0) return

    const totalLen = chunks.reduce((n, a) => n + a.length, 0)
    if (totalLen < SAMPLE_RATE * 0.5) return      // skip if < 0.5 s of audio

    const merged = new Float32Array(totalLen)
    let offset = 0
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length }

    const wav    = encodeWAV(merged, SAMPLE_RATE)
    const base64 = arrayBufferToBase64(wav)

    setInterimText('Processando áudio…')

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization':    `Bearer ${API_KEY}`,
          'HTTP-Referer':     SITE_URL  ?? window.location.origin,
          'X-OpenRouter-Title': SITE_NAME ?? 'ProntuApp',
          'Content-Type':     'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/healer-alpha',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva este áudio de consulta médica em português. Retorne apenas o texto transcrito, sem comentários adicionais.',
              },
              {
                type: 'input_audio',
                input_audio: { data: base64, format: 'wav' },
              },
            ],
          }],
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        console.error('OpenRouter error', res.status, body)
        setError(`Erro na API (${res.status}). Verifique o console.`)
        setInterimText('')
        return
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const text = data.choices?.[0]?.message?.content?.trim() ?? ''

      if (text) {
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
      }
    } catch {
      setError('Erro de conexão com a API OpenRouter.')
    } finally {
      setInterimText('')
    }
  }, [])

  // ── public API ────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!isSupported) return
    setError(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Permissão de microfone negada. Habilite nas configurações do navegador.')
      return
    }

    streamRef.current = stream
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
    audioCtxRef.current = ctx

    const source    = ctx.createMediaStreamSource(stream)
    // ScriptProcessorNode is deprecated but broadly supported; fine for local use
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (!isRecordingRef.current) return
      samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    }

    source.connect(processor)
    processor.connect(ctx.destination)

    startTimeRef.current  = Date.now()
    isRecordingRef.current = true
    speakerRef.current    = 'doctor'
    samplesRef.current    = []

    setTranscript([])
    setInterimText('')
    setDuration(0)
    setIsRecording(true)
    setIsPaused(false)
    setCurrentSpeaker('doctor')

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    chunkTimerRef.current = setInterval(() => {
      if (isRecordingRef.current) sendChunk()
    }, CHUNK_MS)
  }, [isSupported, sendChunk])

  const pause = useCallback(() => {
    isRecordingRef.current = false
    stopTimers()
    void sendChunk()     // flush remaining audio
    setIsRecording(false)
    setIsPaused(true)
  }, [sendChunk, stopTimers])

  const resume = useCallback(() => {
    if (!isPaused) return
    isRecordingRef.current = true
    setIsRecording(true)
    setIsPaused(false)

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    chunkTimerRef.current = setInterval(() => {
      if (isRecordingRef.current) sendChunk()
    }, CHUNK_MS)
  }, [isPaused, sendChunk])

  const stop = useCallback(() => {
    isRecordingRef.current = false
    stopTimers()
    void sendChunk()     // flush remaining audio
    stopAudio()
    setIsRecording(false)
    setIsPaused(false)
    setInterimText('')
  }, [sendChunk, stopTimers, stopAudio])

  const toggleSpeaker = useCallback(() => {
    setCurrentSpeaker(prev => {
      const next: Speaker = prev === 'doctor' ? 'patient' : 'doctor'
      speakerRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      isRecordingRef.current = false
      stopTimers()
      stopAudio()
    }
  }, [stopTimers, stopAudio])

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
