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
