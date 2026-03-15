import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SoapEditor } from '../SoapEditor'
import { SOAPDraft } from '../../types'

const draft: SOAPDraft = {
  s: 'Paciente relata: dor no peito.',
  o: 'PA: 145/90 mmHg',
  a: 'hipertensão.',
  p: 'Medicamentos: losartana.',
}

describe('SoapEditor', () => {
  it('renders all 4 SOAP sections', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByText(/subjetivo/i)).toBeInTheDocument()
    expect(screen.getByText(/objetivo/i)).toBeInTheDocument()
    expect(screen.getByText(/avaliação/i)).toBeInTheDocument()
    expect(screen.getByText(/plano/i)).toBeInTheDocument()
  })

  it('displays draft content in textareas', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue(/dor no peito/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/145\/90/i)).toBeInTheDocument()
  })

  it('calls onChange when user edits S section', () => {
    const onChange = vi.fn()
    render(<SoapEditor draft={draft} onChange={onChange} />)
    const textarea = screen.getByDisplayValue(/dor no peito/i)
    fireEvent.change(textarea, { target: { value: 'novo texto' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ s: 'novo texto' }))
  })

  it('shows disclaimer label', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByText(/rascunho gerado|revise antes/i)).toBeInTheDocument()
  })

  it('shows copy button', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
  })

  it('shows download button', () => {
    render(<SoapEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })
})
