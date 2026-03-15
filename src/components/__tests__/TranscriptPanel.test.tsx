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
