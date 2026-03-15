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
