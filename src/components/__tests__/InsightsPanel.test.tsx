import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InsightsPanel } from '../InsightsPanel'
import { Alert, SOAPDraft, ChecklistItem } from '../../types'

const noAlerts: Alert[] = []
const emptySOAP: SOAPDraft = { s: '', o: '', a: '', p: '' }
const noChecklist: ChecklistItem[] = []

const baseProps = {
  alerts: noAlerts,
  soapDraft: emptySOAP,
  onSoapChange: vi.fn(),
  checklist: noChecklist,
  onChecklistToggle: vi.fn(),
}

describe('InsightsPanel', () => {
  it('renders three tab buttons', () => {
    render(<InsightsPanel {...baseProps} />)
    expect(screen.getByRole('tab', { name: /insights/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /soap/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /checklist/i })).toBeInTheDocument()
  })

  it('shows Insights tab by default', () => {
    render(<InsightsPanel {...baseProps} />)
    expect(screen.getByRole('tab', { name: /insights/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('switching to SOAP tab shows SoapEditor', () => {
    render(<InsightsPanel {...baseProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /soap/i }))
    expect(screen.getByText(/subjetivo/i)).toBeInTheDocument()
  })

  it('switching to Checklist tab shows Checklist', () => {
    render(<InsightsPanel {...baseProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /checklist/i }))
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renders alert cards on Insights tab', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'critico', message: 'Crise hipertensiva', detail: 'PA 185/110' },
    ]
    render(<InsightsPanel {...baseProps} alerts={alerts} />)
    expect(screen.getByText('Crise hipertensiva')).toBeInTheDocument()
  })

  it('shows alert count badge on tab when alerts present', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'aviso', message: 'Hipertensão Estágio 1' },
      { id: '2', severity: 'info',  message: 'Pré-hipertensão' },
    ]
    render(<InsightsPanel {...baseProps} alerts={alerts} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
