import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checklist } from '../Checklist'
import { ChecklistItem } from '../../types'

const items: ChecklistItem[] = [
  { id: '1', text: 'Solicitar ECG', done: false },
  { id: '2', text: 'Verificar glicemia em jejum', done: true },
]

describe('Checklist', () => {
  it('shows empty state when no items', () => {
    render(<Checklist items={[]} onToggle={vi.fn()} />)
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renders all checklist items', () => {
    render(<Checklist items={items} onToggle={vi.fn()} />)
    expect(screen.getByText('Solicitar ECG')).toBeInTheDocument()
    expect(screen.getByText('Verificar glicemia em jejum')).toBeInTheDocument()
  })

  it('completed item has checked checkbox', () => {
    render(<Checklist items={items} onToggle={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('calls onToggle with item id when clicked', () => {
    const onToggle = vi.fn()
    render(<Checklist items={items} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onToggle).toHaveBeenCalledWith('1')
  })
})
